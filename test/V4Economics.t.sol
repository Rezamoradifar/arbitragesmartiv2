// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV4, ISwapRouter02 } from "../src/ArbiSmartV4.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract V4USDC is ERC20 {
    constructor() ERC20("Test USD", "tUSD") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract V4Router {
    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata p) external returns (uint256 amountOut) {
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        amountOut = p.amountIn;
        IERC20(p.tokenOut).transfer(p.recipient, amountOut);
    }
}

/**
 * The four economic changes V4 makes, and the invariant that ties them
 * together: a claim can never move more collateral than the yield that
 * actually accrued.
 *
 * V3 broke that invariant by design — referral rewards were credited on top of
 * a claim out of pooled capital, so a full Platinum upline cost the pool 135%
 * of the accrual and the hole widened exactly as the referral programme
 * succeeded. Most of what follows exists to pin that down.
 */
contract V4EconomicsTest is Test {
    V4USDC usdc;
    V4USDC usdce;
    V4Router router;
    ArbiSmartV4 arbi;

    address owner = address(0xA11CE);
    address feeWallet1 = address(0xFEE1);
    address feeWallet2 = address(0xFEE2);
    address profitRecipient = address(0xF00D);
    address dev1 = address(0xD001);
    address dev2 = address(0xD002);

    address alice = address(0xA1);
    address bob = address(0xB0B);
    address carol = address(0xCA401);
    address dave = address(0xDA5E);

    uint256 constant DAY = 1 days;

    function setUp() public {
        vm.warp(1_800_000_000);

        usdc = new V4USDC();
        usdce = new V4USDC();
        router = new V4Router();

        arbi = new ArbiSmartV4(
            address(usdc),
            address(usdce),
            address(router),
            100,
            owner,
            feeWallet1,
            feeWallet2,
            profitRecipient,
            dev1,
            dev2,
            500,
            500
        );

        usdce.mint(address(router), 10_000_000_000000);
        usdc.mint(address(router), 10_000_000_000000);

        address[4] memory users = [alice, bob, carol, dave];
        for (uint256 i = 0; i < users.length; i++) {
            usdc.mint(users[i], 1_000_000_000000);
            vm.prank(users[i], users[i]);
            usdc.approve(address(arbi), type(uint256).max);
        }
    }

    function _pastFreeWindow() internal {
        vm.warp(block.timestamp + 25 hours);
    }

    function _stake(address who, uint256 gross, address referrer) internal {
        vm.prank(who, who);
        arbi.stake(gross, referrer);
    }

    /* ---------------------------------------------------- sliding entry fee */

    function test_DepositFeeBands() public view {
        assertEq(arbi.depositFeeBps(100_000000), 1200, "under 500 pays 12%");
        assertEq(arbi.depositFeeBps(499_999999), 1200);
        assertEq(arbi.depositFeeBps(500_000000), 1000, "500 pays 10%");
        assertEq(arbi.depositFeeBps(2_499_999999), 1000);
        assertEq(arbi.depositFeeBps(2_500_000000), 700, "2,500 pays 7%");
        assertEq(arbi.depositFeeBps(9_999_999999), 700);
        assertEq(arbi.depositFeeBps(10_000_000000), 500, "10,000 pays 5%");
        assertEq(arbi.depositFeeBps(25_000_000000), 500);
    }

    /// A band boundary must never leave a larger deposit with a smaller stake,
    /// or the fee schedule would pay people to send less.
    function test_NetStakeIsMonotonicAcrossBands() public view {
        uint256[8] memory probes = [
            uint256(499_999999),
            500_000000,
            2_499_999999,
            2_500_000000,
            9_999_999999,
            10_000_000000,
            15_000_000000,
            25_000_000000
        ];
        uint256 previousNet = 0;
        for (uint256 i = 0; i < probes.length; i++) {
            (,,, uint256 net) = arbi.quoteDeposit(probes[i]);
            assertGe(net, previousNet, "a larger deposit recorded a smaller stake");
            previousNet = net;
        }
    }

    function testFuzz_NetStakeNeverExceedsGross(uint256 gross) public view {
        gross = bound(gross, 1, 25_000_000000);
        (uint256 fee1, uint256 fee2, uint256 totalFee, uint256 net) = arbi.quoteDeposit(gross);
        assertEq(fee1 + fee2, totalFee, "halves must sum to the total");
        assertEq(net + totalFee, gross, "nothing may be created or lost");
    }

    /* ------------------------------------------------------ tiered claim fee */

    function test_ClaimFeeHalvesForUpperPlans() public view {
        assertEq(arbi.claimFeeBps(0), 1000, "Starter");
        assertEq(arbi.claimFeeBps(1), 1000, "Growth");
        assertEq(arbi.claimFeeBps(2), 500, "Advanced");
        assertEq(arbi.claimFeeBps(3), 500, "Elite");
    }

    /* ------------------------------------- the invariant V3 could not hold */

    /// A claim moves exactly the yield that accrued: fee + upline + user.
    function test_ClaimNeverPaysMoreThanAccrued() public {
        _pastFreeWindow();

        // A four-deep chain, so F1, F2 and F3 are all live.
        _stake(alice, 1_000_000000, address(0));
        _stake(bob, 1_000_000000, alice);
        _stake(carol, 1_000_000000, bob);
        _stake(dave, 1_000_000000, carol);

        vm.warp(block.timestamp + 10 * DAY);

        uint256 accrued = arbi.getReward(dave);
        assertGt(accrued, 0, "nothing accrued");

        uint256 poolBefore = usdc.balanceOf(address(arbi));
        uint256 daveBefore = usdc.balanceOf(dave);
        uint256 feeBefore = usdc.balanceOf(feeWallet1) + usdc.balanceOf(feeWallet2);

        vm.prank(dave, dave);
        arbi.claim();

        uint256 poolSpent = poolBefore - usdc.balanceOf(address(arbi));
        uint256 daveGot = usdc.balanceOf(dave) - daveBefore;
        uint256 feesGot = usdc.balanceOf(feeWallet1) + usdc.balanceOf(feeWallet2) - feeBefore;

        // Referral rewards are credited, not transferred, so they stay in the
        // contract until claimRef. What LEFT the pool is user + fees.
        assertEq(poolSpent, daveGot + feesGot, "pool moved something unaccounted for");

        uint256 uplineCredited = arbi.getRefReward(carol) + arbi.getRefReward(bob) + arbi.getRefReward(alice);
        assertEq(daveGot + feesGot + uplineCredited, accrued, "claim did not sum back to the accrual");
        assertLe(daveGot + feesGot + uplineCredited, accrued, "claim exceeded the accrual");
    }

    /// The upline share is bounded even when every tier differs.
    function testFuzz_ReferralNeverExceedsTheClaim(uint256 elapsed) public {
        elapsed = bound(elapsed, 1 hours, 100 * DAY);
        _pastFreeWindow();

        _stake(alice, 5_000_000000, address(0));
        _stake(bob, 5_000_000000, alice);
        _stake(carol, 5_000_000000, bob);
        _stake(dave, 1_000_000000, carol);

        vm.warp(block.timestamp + elapsed);
        uint256 accrued = arbi.getReward(dave);
        vm.assume(accrued > 0);

        vm.prank(dave, dave);
        arbi.claim();

        uint256 upline = arbi.getRefReward(carol) + arbi.getRefReward(bob) + arbi.getRefReward(alice);
        assertLe(upline, accrued, "upline was paid more than the claim");
    }

    /// A referrer who has exited earns nothing further: the share is paid for
    /// holding a position, not for having once held one.
    function test_InactiveReferrerEarnsNothing() public {
        _pastFreeWindow();
        _stake(alice, 1_000_000000, address(0));
        _stake(bob, 1_000_000000, alice);

        vm.prank(alice, alice);
        arbi.earlyExit();

        vm.warp(block.timestamp + 10 * DAY);
        vm.prank(bob, bob);
        arbi.claim();

        assertEq(arbi.getRefReward(alice), 0, "an exited referrer was still paid");
    }

    /* ------------------------------------------------ volume-gated tiers */

    function test_TierNeedsVolumeNotJustHeadcount() public {
        _pastFreeWindow();
        _stake(alice, 1_000_000000, address(0)); // 900 net, over Silver's 500

        // Three referrals clear the count but nowhere near the 2,500 volume.
        _stake(bob, 100_000000, alice);
        _stake(carol, 100_000000, alice);
        _stake(dave, 100_000000, alice);

        (,,, uint256 level) = _refInfo(alice);
        assertEq(level, 0, "headcount alone bought a tier");

        // One large referral supplies the volume; now all three conditions hold.
        address eve = address(0xE7E);
        usdc.mint(eve, 100_000_000000);
        vm.prank(eve, eve);
        usdc.approve(address(arbi), type(uint256).max);
        _stake(eve, 5_000_000000, alice);

        (,,, level) = _refInfo(alice);
        assertEq(level, 1, "Silver was not reached with volume, count and stake all met");
    }

    /// The V3 ratchet: volume that only ever rose let a member take a tier and
    /// keep it after the whole downline left.
    function test_VolumeFallsWhenAReferralExits() public {
        _pastFreeWindow();
        _stake(alice, 1_000_000000, address(0));
        _stake(bob, 3_000_000000, alice);
        _stake(carol, 100_000000, alice);
        _stake(dave, 100_000000, alice);

        (,,, uint256 level) = _refInfo(alice);
        assertEq(level, 1, "Silver not reached");

        (uint256 volumeBefore,,) = arbi.getTeamVolume(alice);
        vm.prank(bob, bob);
        arbi.earlyExit();
        (uint256 volumeAfter,,) = arbi.getTeamVolume(alice);

        assertLt(volumeAfter, volumeBefore, "volume did not fall with the exit");

        (,,, level) = _refInfo(alice);
        assertEq(level, 0, "the tier survived the downline leaving");
    }

    /* --------------------------------------------------- free-stake funnel */

    function test_FreeStakeCannotClaimUntilFunded() public {
        // Inside the launch window.
        _stake(alice, 10_000000, address(0));

        vm.warp(block.timestamp + 30 * DAY);
        assertGt(arbi.getReward(alice), 0, "a free position should still accrue");

        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV4.FreeStakeNotActivated.selector);
        arbi.claim();

        // Funding it unlocks the claim.
        vm.prank(alice, alice);
        arbi.topUp(200_000000);

        vm.prank(alice, alice);
        arbi.claim();
        assertGt(usdc.balanceOf(alice), 0);
    }

    /// The giveaway principal is never returned by either exit path.
    function test_FreePrincipalIsNeverReturned() public {
        _stake(alice, 10_000000, address(0));
        vm.prank(alice, alice);
        arbi.topUp(200_000000); // 12% band → 176 net funded

        uint256 before = usdc.balanceOf(alice);
        vm.warp(block.timestamp + 40 * DAY);
        vm.prank(alice, alice);
        arbi.earlyExit();
        uint256 returned = usdc.balanceOf(alice) - before;

        // 176 funded, week-6 penalty of 10% → 158.4. The free 10 stays put.
        assertEq(returned, 158_400000, "the giveaway leaked out as principal");
    }

    /// Regression: V4 opened top-up to giveaway positions but left the plan
    /// upgrade shut, which stranded a converted user on Starter's rate no
    /// matter how large their real deposit grew.
    function test_ConvertedFreeStakeCanUpgradeItsPlan() public {
        _stake(alice, 10_000000, address(0)); // giveaway, Starter

        vm.prank(alice, alice);
        arbi.topUp(1_000_000000); // 10% band -> 900 net, total 910

        vm.prank(alice, alice);
        arbi.upgradePlan();

        (, uint256 plan,,,,,,) = arbi.getStakeBasic(alice);
        assertEq(plan, 1, "a funded giveaway could not reach Growth");
    }

    /// A giveaway that has NOT been funded still cannot upgrade — the gate is
    /// the deposit, not the mere existence of a top-up path.
    function test_UnfundedFreeStakeCannotUpgrade() public {
        _stake(alice, 10_000000, address(0));
        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV4.FreeStakeNotActivated.selector);
        arbi.upgradePlan();
    }

    /// Regression: the upline budget used to be capped against the whole
    /// claim rather than the claim minus the fee, so `reward - fee - upline`
    /// was underflow-free only by coincidence of the rate table.
    function test_FeePlusUplineNeverExceedsTheClaim() public {
        _pastFreeWindow();
        _stake(alice, 20_000_000000, address(0));
        _stake(bob, 20_000_000000, alice);
        _stake(carol, 20_000_000000, bob);
        _stake(dave, 20_000_000000, carol);

        vm.warp(block.timestamp + 30 * DAY);
        uint256 accrued = arbi.getReward(dave);

        uint256 daveBefore = usdc.balanceOf(dave);
        uint256 feeBefore = usdc.balanceOf(feeWallet1) + usdc.balanceOf(feeWallet2);
        vm.prank(dave, dave);
        arbi.claim();

        uint256 got = usdc.balanceOf(dave) - daveBefore;
        uint256 fees = usdc.balanceOf(feeWallet1) + usdc.balanceOf(feeWallet2) - feeBefore;
        uint256 upline = arbi.getRefReward(carol) + arbi.getRefReward(bob) + arbi.getRefReward(alice);

        assertEq(got + fees + upline, accrued, "the three parts did not sum to the accrual");
        assertGt(got, 0, "the claimer was left with nothing");
    }

    function test_FreeStakeCapIsOneHundred() public view {
        assertEq(arbi.MAX_FREE_STAKES(), 100);
    }

    /* ------------------------------------------------------- downline views */

    function test_SecondAndThirdLevelsAreNamed() public {
        _pastFreeWindow();
        _stake(alice, 1_000_000000, address(0));
        _stake(bob, 1_000_000000, alice);
        _stake(carol, 1_000_000000, bob);
        _stake(dave, 1_000_000000, carol);

        address[] memory f2 = arbi.getF2List(alice);
        assertEq(f2.length, 1);
        assertEq(f2[0], carol, "alice's second level should be carol");

        address[] memory f3 = arbi.getF3List(alice);
        assertEq(f3.length, 1);
        assertEq(f3[0], dave, "alice's third level should be dave");
    }

    function _refInfo(address user)
        internal
        view
        returns (address referrer, uint256 totalEarned, uint256 pending, uint256 level)
    {
        uint256 activeReferrals;
        (referrer, totalEarned, pending, activeReferrals, level) = arbi.getReferralInfo(user);
    }
}

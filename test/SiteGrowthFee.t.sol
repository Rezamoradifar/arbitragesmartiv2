// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV3 } from "../src/ArbiSmartV3.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDC is ERC20 {
    constructor() ERC20("Test USD Coin", "tUSDC") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockConditionalTokens {
    uint256 public redeemPayout;

    function setRedeemPayout(uint256 amount) external {
        redeemPayout = amount;
    }

    function splitPosition(IERC20 collateralToken, bytes32, bytes32, uint256[] calldata, uint256 amount) external {
        collateralToken.transferFrom(msg.sender, address(this), amount);
    }

    function mergePositions(IERC20 collateralToken, bytes32, bytes32, uint256[] calldata, uint256 amount) external {
        collateralToken.transfer(msg.sender, amount);
    }

    function redeemPositions(IERC20 collateralToken, bytes32, bytes32, uint256[] calldata) external {
        collateralToken.transfer(msg.sender, redeemPayout);
    }

    function balanceOf(address, uint256) external pure returns (uint256) {
        return 0;
    }
}

/// @notice Covers the one thing V3 adds over V2: the disclosed deposit fee.
///
/// The property under test throughout is that the fee is taken *before* a
/// stake is recorded, never out of one afterwards — so the contract's
/// liability equals what it actually holds at every point, and the owner's
/// reach is bounded by fees genuinely charged rather than by policy.
contract SiteGrowthFeeTest is Test {
    ArbiSmartV3 internal arbi;
    TestUSDC internal usdc;
    MockConditionalTokens internal ctf;

    address internal constant CTF_ADDRESS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    address internal owner = makeAddr("owner");
    address internal feeWallet1 = makeAddr("feeWallet1");
    address internal feeWallet2 = makeAddr("feeWallet2");
    address internal profitRecipient = makeAddr("profitRecipient");
    address internal growth1 = makeAddr("siteGrowth1");
    address internal growth2 = makeAddr("siteGrowth2");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    // 5% + 5% = 10% combined, matching the two-marketing-wallet setup.
    uint256 internal constant BPS1 = 500;
    uint256 internal constant BPS2 = 500;

    function setUp() public {
        usdc = new TestUSDC();
        arbi = new ArbiSmartV3(
            address(usdc), owner, feeWallet1, feeWallet2, profitRecipient, growth1, growth2, BPS1, BPS2
        );

        MockConditionalTokens impl = new MockConditionalTokens();
        vm.etch(CTF_ADDRESS, address(impl).code);
        ctf = MockConditionalTokens(CTF_ADDRESS);

        vm.warp(block.timestamp + 25 hours); // past the free-stake window

        usdc.mint(alice, 1_000_000_000000);
        usdc.mint(bob, 1_000_000_000000);
        vm.prank(alice, alice);
        usdc.approve(address(arbi), type(uint256).max);
        vm.prank(bob, bob);
        usdc.approve(address(arbi), type(uint256).max);
    }

    function _partition() internal pure returns (uint256[] memory p) {
        p = new uint256[](2);
        p[0] = 1;
        p[1] = 2;
    }

    // ---------------------------------------------------------------
    // The three scenarios requested: 100 / 1,000 / 10,000 USDT
    // ---------------------------------------------------------------

    function _assertSplit(uint256 gross) internal {
        uint256 expFee1 = (gross * BPS1) / 10_000;
        uint256 expFee2 = (gross * BPS2) / 10_000;
        uint256 expNet = gross - expFee1 - expFee2;

        vm.prank(alice, alice);
        arbi.stake(gross, address(0));

        (,,, uint256 activeStake) = arbi.userDepositBreakdown(alice);
        assertEq(activeStake, expNet, "stake must be recorded NET, never gross");
        assertEq(arbi.totalStaked(), expNet, "liability is the net figure");
        assertEq(arbi.siteGrowthCollected1(), expFee1, "budget 1 accrual");
        assertEq(arbi.siteGrowthCollected2(), expFee2, "budget 2 accrual");
        assertEq(arbi.totalGrossDeposits(), gross, "gross tracked for reporting only");

        // The decisive invariant: the pool is never short against what it booked.
        assertGe(arbi.totalAssets(), arbi.totalStaked(), "pool must fully back recorded stakes");
        // And nothing is conjured: the three parts sum to exactly the deposit.
        assertEq(expFee1 + expFee2 + expNet, gross, "split must be exact");
    }

    function test_split_100USDT() public {
        _assertSplit(100_000000);
        (,,, uint256 stakeAmt) = arbi.userDepositBreakdown(alice);
        assertEq(stakeAmt, 90_000000, "100 gross -> 90 net at 10%");
    }

    function test_split_1000USDT() public {
        _assertSplit(1000_000000);
        (,,, uint256 stakeAmt) = arbi.userDepositBreakdown(alice);
        assertEq(stakeAmt, 900_000000, "1000 gross -> 900 net at 10%");
    }

    function test_split_10000USDT() public {
        _assertSplit(10_000_000000);
        (,,, uint256 stakeAmt) = arbi.userDepositBreakdown(alice);
        assertEq(stakeAmt, 9000_000000, "10000 gross -> 9000 net at 10%");
    }

    // ---------------------------------------------------------------
    // Disclosure
    // ---------------------------------------------------------------

    function test_quoteDeposit_matchesWhatStakeActuallyDoes() public {
        uint256 gross = 1234_567890;
        (uint256 qFee1, uint256 qFee2, uint256 qTotal, uint256 qNet) = arbi.quoteDeposit(gross);
        assertEq(qTotal, qFee1 + qFee2, "quoted total is the sum of parts");

        vm.prank(alice, alice);
        arbi.stake(gross, address(0));

        (, uint256 feePaid, uint256 net,) = arbi.userDepositBreakdown(alice);
        assertEq(feePaid, qTotal, "quote must equal the fee actually charged");
        assertEq(net, qNet, "quote must equal the stake actually recorded");
    }

    // ---------------------------------------------------------------
    // Fee withdrawal bounds
    // ---------------------------------------------------------------

    function test_ownerWithdrawsOnlyCollectedFees() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        uint256 fee1 = arbi.siteGrowthCollected1();
        assertEq(fee1, 50_000000, "5% of 1000");

        vm.prank(owner);
        arbi.withdrawSiteGrowthFees(1, fee1);

        assertEq(usdc.balanceOf(growth1), fee1, "budget 1 wallet funded");
        assertEq(arbi.siteGrowthWithdrawn1(), fee1);
        assertEq(arbi.pendingSiteGrowthFees(), arbi.siteGrowthCollected2(), "only budget 2 remains");
    }

    function test_cannotWithdrawMoreThanCollected() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        uint256 collected = arbi.siteGrowthCollected1();
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV3.ExceedsCollectedFees.selector);
        arbi.withdrawSiteGrowthFees(1, collected + 1);
    }

    function test_budgetsAreIsolatedFromEachOther() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        // Drain budget 1 entirely, then try to take one more unit from it
        // while budget 2 still holds funds — the shared ERC-20 balance must
        // not let one budget spend the other's allocation.
        uint256 c1 = arbi.siteGrowthCollected1();
        vm.startPrank(owner);
        arbi.withdrawSiteGrowthFees(1, c1);
        vm.expectRevert(ArbiSmartV3.ExceedsCollectedFees.selector);
        arbi.withdrawSiteGrowthFees(1, 1);
        vm.stopPrank();

        assertGt(arbi.siteGrowthCollected2(), 0, "budget 2 still funded");
    }

    function test_ownerCannotReachStakerPrincipal() public {
        vm.prank(alice, alice);
        arbi.stake(10_000_000000, address(0));

        uint256 principal = arbi.totalStaked();
        uint256 feesEver = arbi.siteGrowthCollected1() + arbi.siteGrowthCollected2();

        vm.startPrank(owner);
        arbi.withdrawSiteGrowthFees(1, arbi.siteGrowthCollected1());
        arbi.withdrawSiteGrowthFees(2, arbi.siteGrowthCollected2());
        // Everything owed to the platform is now paid. Anything further reverts.
        vm.expectRevert(ArbiSmartV3.ExceedsCollectedFees.selector);
        arbi.withdrawSiteGrowthFees(1, 1);
        vm.expectRevert(ArbiSmartV3.ExceedsCollectedFees.selector);
        arbi.withdrawSiteGrowthFees(2, 1);
        vm.stopPrank();

        // The pool is untouched and still fully backs the recorded stake.
        assertEq(usdc.balanceOf(address(arbi)), principal, "only principal remains");
        assertGe(arbi.totalAssets(), principal, "pool still fully backed");
        assertEq(usdc.balanceOf(growth1) + usdc.balanceOf(growth2), feesEver, "owner got exactly the fees");
    }

    function test_nonOwnerCannotWithdrawFees() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        vm.prank(bob);
        vm.expectRevert();
        arbi.withdrawSiteGrowthFees(1, 1_000000);
    }

    // ---------------------------------------------------------------
    // Fee/pool separation
    // ---------------------------------------------------------------

    function test_pendingFeesExcludedFromTotalAssets() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        uint256 rawBalance = usdc.balanceOf(address(arbi));
        assertEq(rawBalance, 1000_000000, "contract holds the whole gross deposit");
        assertEq(arbi.totalAssets(), 900_000000, "but only the net counts as pool capital");
        assertEq(arbi.pendingSiteGrowthFees(), 100_000000, "the rest is earmarked platform revenue");
    }

    /// @dev Without netting fees out of {totalAssets}, unswept fees would
    ///      inflate the arbitrage ceiling — letting the strategy be sized
    ///      against money owed to someone else.
    function test_arbitrageCeilingIgnoresUnsweptFees() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        // 20% of the 900 net pool, not of the 1000 raw balance.
        assertEq(arbi.arbitrageDeploymentCeiling(), 180_000000, "ceiling sized on pool capital only");
    }

    function test_withdrawingFeesDoesNotChangePoolCapital() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        uint256 before = arbi.totalAssets();
        vm.startPrank(owner);
        arbi.withdrawSiteGrowthFees(1, arbi.siteGrowthCollected1());
        arbi.withdrawSiteGrowthFees(2, arbi.siteGrowthCollected2());
        vm.stopPrank();

        assertEq(arbi.totalAssets(), before, "sweeping fees must not move pool capital");
    }

    // ---------------------------------------------------------------
    // Interaction with the rest of the protocol
    // ---------------------------------------------------------------

    function test_yieldAccruesOnNetStakeNotGross() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0)); // net 900, plan 1 (1.8%/day)

        vm.warp(block.timestamp + 1 days);

        // 1.8% of 900 == 16.2, not 1.8% of 1000 == 18.
        assertEq(arbi.getReward(alice), 16_200000, "yield is computed on the net stake");
    }

    function test_planTierDerivedFromNetStake() public {
        // 500 gross nets 450 — below the 500 threshold, so this is plan 0,
        // not plan 1. Sizing the tier off the gross would promise a rate the
        // recorded stake does not qualify for.
        vm.prank(alice, alice);
        arbi.stake(500_000000, address(0));

        (, uint256 plan,,,,,,,) = arbi.stakes(alice);
        assertEq(plan, 0, "tier follows the net stake");
    }

    function test_exitReturnsNetPrincipalOnly() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        vm.warp(block.timestamp + 5 weeks); // penalty floor: 10%
        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.earlyExit();

        // 900 net principal, less the 10% floor penalty.
        assertEq(usdc.balanceOf(alice) - balBefore, 810_000000, "exit pays out of the net stake");
    }

    function test_topUpChargesTheSameFee() public {
        vm.startPrank(alice, alice);
        arbi.stake(1000_000000, address(0));
        arbi.topUp(1000_000000);
        vm.stopPrank();

        (uint256 gross, uint256 fee, uint256 net, uint256 active) = arbi.userDepositBreakdown(alice);
        assertEq(gross, 2000_000000);
        assertEq(fee, 200_000000, "same 10% on the top-up");
        assertEq(net, 1800_000000);
        assertEq(active, 1800_000000, "stake reflects both net amounts");
        assertGe(arbi.totalAssets(), arbi.totalStaked(), "still fully backed");
    }

    function test_referralVolumeUsesNetAmount() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));
        vm.prank(bob, bob);
        arbi.stake(1000_000000, alice);

        (uint256 f1Vol,,) = arbi.getTeamVolume(alice);
        assertEq(f1Vol, 900_000000, "team volume counts net, not gross");
    }

    // ---------------------------------------------------------------
    // Configuration bounds
    // ---------------------------------------------------------------

    function test_deploymentRejectsFeeAboveCap() public {
        vm.expectRevert(ArbiSmartV3.SiteGrowthFeeTooHigh.selector);
        new ArbiSmartV3(
            address(usdc), owner, feeWallet1, feeWallet2, profitRecipient, growth1, growth2, 1500, 600
        );
    }

    /// @dev The rate is immutable by construction; this documents that there
    ///      is no setter at all, so a depositor's disclosed fee cannot be
    ///      raised under them after the fact.
    function test_feeRateIsImmutable() public view {
        assertEq(arbi.SITE_GROWTH_BPS_1(), BPS1);
        assertEq(arbi.SITE_GROWTH_BPS_2(), BPS2);
    }

    function test_setSiteGrowthWalletMovesFutureFeesOnly() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        address newWallet = makeAddr("newGrowth1");
        uint256 collected = arbi.siteGrowthCollected1();

        vm.startPrank(owner);
        arbi.setSiteGrowthWallet(1, newWallet);
        arbi.withdrawSiteGrowthFees(1, collected);
        vm.stopPrank();
        assertEq(usdc.balanceOf(newWallet), 50_000000, "paid to the new destination");
        assertEq(usdc.balanceOf(growth1), 0, "old destination unfunded");
    }

    function test_nonOwnerCannotRepointWallet() public {
        vm.prank(bob);
        vm.expectRevert();
        arbi.setSiteGrowthWallet(1, bob);
    }

    // ---------------------------------------------------------------
    // Dashboard
    // ---------------------------------------------------------------

    function test_dashboardReportsConsistentFigures() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));
        vm.prank(bob, bob);
        arbi.stake(2000_000000, address(0));

        (
            uint256 gross,
            uint256 fees,
            uint256 net,
            uint256 pool,
            uint256 growthBal,
            uint256 deployed
        ) = arbi.dashboard();

        assertEq(gross, 3000_000000);
        assertEq(fees, 300_000000);
        assertEq(net, 2700_000000);
        assertEq(pool, 2700_000000);
        assertEq(growthBal, 300_000000);
        assertEq(deployed, 0);
        assertEq(gross, fees + net, "gross must decompose exactly");
    }

    // ---------------------------------------------------------------
    // Zero-fee configuration still behaves like V2
    // ---------------------------------------------------------------

    function test_zeroFeeBehavesLikeV2() public {
        ArbiSmartV3 free = new ArbiSmartV3(
            address(usdc), owner, feeWallet1, feeWallet2, profitRecipient, growth1, growth2, 0, 0
        );
        vm.warp(block.timestamp + 25 hours);
        vm.startPrank(alice, alice);
        usdc.approve(address(free), type(uint256).max);
        free.stake(1000_000000, address(0));
        vm.stopPrank();

        (,,, uint256 active) = free.userDepositBreakdown(alice);
        assertEq(active, 1000_000000, "no fee, no haircut");
        assertEq(free.pendingSiteGrowthFees(), 0);
    }

    // ---------------------------------------------------------------
    // Fuzz: the split is exact and the pool is never short
    // ---------------------------------------------------------------

    function testFuzz_splitIsExactAndPoolStaysBacked(uint256 gross) public {
        gross = bound(gross, 12_000000, 25_000_000000);

        (uint256 f1, uint256 f2, uint256 total, uint256 net) = arbi.quoteDeposit(gross);
        assertEq(f1 + f2 + net, gross, "no value created or destroyed");
        assertEq(total, f1 + f2);

        vm.assume(net >= 10_000000 && net <= 25_000_000000);
        vm.prank(alice, alice);
        arbi.stake(gross, address(0));

        assertEq(arbi.totalStaked(), net);
        assertGe(arbi.totalAssets(), arbi.totalStaked(), "pool fully backs recorded stakes");
        assertEq(
            usdc.balanceOf(address(arbi)), arbi.totalAssets() + arbi.pendingSiteGrowthFees(), "balance decomposes"
        );
    }
}

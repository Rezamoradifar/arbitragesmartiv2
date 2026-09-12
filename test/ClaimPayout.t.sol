// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV4, ISwapRouter02 } from "../src/ArbiSmartV4.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CUSD is ERC20 {
    constructor() ERC20("Test USD", "tUSD") { }
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

contract CRouter {
    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata p) external returns (uint256 out) {
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        out = p.amountIn;
        IERC20(p.tokenOut).transfer(p.recipient, out);
    }
}

/**
 * What a claim actually pays the person claiming.
 *
 * The deposit calculator and the dashboard both quoted `reward - claimFee` as
 * the payout. `claim()` computes `reward - claimFee - referralPaid`, and the
 * upline share comes out of the CLAIMER'S yield, not out of the pool on top of
 * it. For anybody who arrived through a referral link — which is how the whole
 * growth model is designed to work — the quoted figure was too high by the
 * whole referral share.
 *
 * These tests measure the wallet balance across a claim so the front end has a
 * number it can be checked against rather than a formula somebody read off the
 * source.
 */
contract ClaimPayoutTest is Test {
    CUSD usdc;
    CUSD usdce;
    CRouter router;
    ArbiSmartV4 arbi;

    address owner = address(0xA11CE);
    address alice = address(0xA1); // claimer
    address bob = address(0xB0B); // direct upline
    address carol = address(0xCA401); // upline's upline

    uint256 constant DAY = 1 days;

    function setUp() public {
        vm.warp(1_800_000_000);
        usdc = new CUSD();
        usdce = new CUSD();
        router = new CRouter();
        arbi = new ArbiSmartV4(
            address(usdc), address(usdce), address(router), 100, owner,
            address(0xFEE1), address(0xFEE2), address(0xF00D),
            address(0xD001), address(0xD002), 500, 500
        );
        usdc.mint(address(router), 10_000_000_000000);
        usdce.mint(address(router), 10_000_000_000000);
        for (uint256 i = 0; i < 3; i++) {
            address who = i == 0 ? alice : i == 1 ? bob : carol;
            usdc.mint(who, 1_000_000_000000);
            vm.prank(who, who);
            usdc.approve(address(arbi), type(uint256).max);
        }
        // Fund the pool so a claim is never short of collateral — this test is
        // about the split, not about solvency.
        usdc.mint(address(arbi), 1_000_000_000000);
        // Past the free-stake window, so every position here is paid for.
        vm.warp(block.timestamp + 25 hours);
    }

    /// Reference: no referrer at all. The old formula is right only here.
    function test_ClaimWithNoUplinePaysRewardMinusFeeOnly() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        vm.warp(block.timestamp + 10 * DAY);
        uint256 reward = arbi.getReward(alice);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.claim();
        uint256 received = usdc.balanceOf(alice) - before;

        // Starter plan pays a 10% claim fee.
        assertEq(received, reward - (reward * 1000) / 10_000, "no-upline payout");
    }

    /**
     * The case the calculator got wrong: one Base-tier upline takes a further
     * 8% of the gross yield out of the claimer's own payout.
     */
    function test_ClaimWithBaseUplineIsEightPercentLower() public {
        vm.prank(bob, bob);
        arbi.stake(1000_000000, address(0));
        vm.prank(alice, alice);
        arbi.stake(1000_000000, bob);

        vm.warp(block.timestamp + 10 * DAY);
        uint256 reward = arbi.getReward(alice);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.claim();
        uint256 received = usdc.balanceOf(alice) - before;

        uint256 fee = (reward * 1000) / 10_000;
        uint256 uplineShare = (reward * 800) / 10_000; // Base, depth 0
        assertEq(received, reward - fee - uplineShare, "payout is net of the upline share");

        // And the upline really did get it — it is a transfer of the same
        // money, not an extra mint.
        assertEq(arbi.getRefReward(bob), uplineShare, "upline credited from the claim");

        // What the front end used to promise, versus what arrived.
        assertLt(received, reward - fee, "old quote overstated the payout");
    }

    /// Two levels deep: 8% + 4% of the gross yield, both out of the claim.
    function test_ClaimWithTwoBaseUplinesLosesTwelvePercent() public {
        vm.prank(carol, carol);
        arbi.stake(1000_000000, address(0));
        vm.prank(bob, bob);
        arbi.stake(1000_000000, carol);
        vm.prank(alice, alice);
        arbi.stake(1000_000000, bob);

        vm.warp(block.timestamp + 10 * DAY);
        uint256 reward = arbi.getReward(alice);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.claim();
        uint256 received = usdc.balanceOf(alice) - before;

        uint256 fee = (reward * 1000) / 10_000;
        uint256 shares = (reward * 800) / 10_000 + (reward * 400) / 10_000;
        assertEq(received, reward - fee - shares, "both levels come out of the claim");
        assertEq(arbi.getRefReward(bob), (reward * 800) / 10_000, "depth 0 at its own tier");
        assertEq(arbi.getRefReward(carol), (reward * 400) / 10_000, "depth 1 at its own tier");
    }

    /**
     * An upline with no active position is skipped, and the money stays in the
     * pool rather than passing further up. The dashboard says so only if it
     * reads the upline's `active` flag, which is why the hook reads it.
     */
    function test_InactiveUplineTakesNothing() public {
        vm.prank(bob, bob);
        arbi.stake(1000_000000, address(0));
        vm.prank(alice, alice);
        arbi.stake(1000_000000, bob);

        // Bob leaves. Alice's chain still points at him.
        vm.prank(bob, bob);
        arbi.earlyExit();

        vm.warp(block.timestamp + 10 * DAY);
        uint256 reward = arbi.getReward(alice);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.claim();
        uint256 received = usdc.balanceOf(alice) - before;

        assertEq(received, reward - (reward * 1000) / 10_000, "skipped upline costs nothing");
        assertEq(arbi.getRefReward(bob), 0, "an exited upline earns nothing");
    }

    /**
     * There is no maturity path. After the full term the only exit is still
     * earlyExit, still at the week-5 rate, so principal never returns whole.
     */
    function test_AfterFullTermExitStillCostsTenPercent() public {
        vm.prank(alice, alice);
        arbi.stake(1000_000000, address(0));

        // Starter is 180 days. Go well past it.
        vm.warp(block.timestamp + 200 * DAY);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.earlyExit();
        uint256 returned = usdc.balanceOf(alice) - before;

        // 1000 gross falls in the 500+ band, so a 10% entry fee records 900.
        // The week-5 penalty is then charged on that 900 even though the whole
        // 180-day term has been served: 900 - 90 = 810.
        assertEq(returned, 810_000000, "term served, principal still docked 10%");
    }
}

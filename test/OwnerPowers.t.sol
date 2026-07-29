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

    /// @notice VECTOR 1 (fixed) — splitting a redemption across two calls
    ///         used to let the owner bill pure staker principal as profit,
    ///         because committedByCondition was zeroed before the contract
    ///         knew how much had actually come back. It is now retired only
    ///         by the amount actually recovered, so the second call still
    ///         sees the unrecovered remainder on the books.
    function test_VECTOR1_partialRedeemCannotBillPrincipalAsProfit() public {
        vm.startPrank(owner);
        arbi.setProfitRecipient(ownerWallet);
        arbi.setProfitFeeBPS(2000); // the 20% hard cap
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 200_000000);
        vm.stopPrank();

        usdc.mint(CTF_ADDRESS, 200_000000);

        // First redeem returns only half the position.
        ctf.setRedeemPayout(100_000000);
        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        assertEq(usdc.balanceOf(ownerWallet), 0, "no fee on a partial return of principal");
        assertEq(arbi.committedByCondition(bytes32("mkt")), 100_000000, "unrecovered principal stays tracked");

        // Second redeem returns the other half. Still principal, still no fee.
        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        assertEq(usdc.balanceOf(ownerWallet), 0, "owner extracts nothing from a break-even round trip");
        assertEq(arbi.committedByCondition(bytes32("mkt")), 0, "commitment fully retired");
        assertEq(arbi.totalArbitrageDeployed(), 0);
    }

    /// @dev The fee must still be charged on genuine profit — the fix must not
    ///      have simply disabled it.
    function test_VECTOR1_feeStillChargedOnRealProfit() public {
        vm.startPrank(owner);
        arbi.setProfitRecipient(ownerWallet);
        arbi.setProfitFeeBPS(2000);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 200_000000);
        vm.stopPrank();

        usdc.mint(CTF_ADDRESS, 300_000000);
        ctf.setRedeemPayout(300_000000); // 100 of real profit over 200 committed

        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        assertEq(usdc.balanceOf(ownerWallet), 20_000000, "20% of the 100 genuine profit");
    }

    /// @notice VECTOR 2 (fixed) — the split cap used to be per-call, so each
    ///         call shrank the balance the next was measured against and
    ///         repeated calls converged on the whole pool. The cap is now
    ///         cumulative against total assets, which a split leaves
    ///         unchanged, so it does not recede as it is consumed.
    function test_VECTOR2_repeatedSplitsCannotBreachTheCumulativeCap() public {
        uint256 startBalance = usdc.balanceOf(address(arbi));

        vm.startPrank(owner);
        for (uint256 i = 0; i < 40; i++) {
            uint256 available = arbi.polymarketArbitrageAvailable();
            if (available == 0) break;
            arbi.executePolymarketSplit(bytes32("mkt"), _partition(), available);
        }
        vm.stopPrank();

        assertEq(arbi.totalArbitrageDeployed(), (startBalance * 2000) / 10000, "deployment stops at exactly 20%");
        assertEq(arbi.polymarketArbitrageAvailable(), 0, "no headroom left");
        assertEq(usdc.balanceOf(address(arbi)), (startBalance * 8000) / 10000, "80% stays liquid");

        // 80% of the pool stays liquid, but a lone staker's full principal is
        // not covered while 20% sits in open positions — that is inherent to
        // deploying capital at all, not a defect. Unwinding restores it, and
        // merge is callable while paused precisely so this works.
        vm.prank(owner);
        arbi.pause();
        vm.warp(block.timestamp + 31 days);

        vm.prank(owner);
        arbi.executePolymarketMerge(bytes32("mkt"), _partition(), (startBalance * 2000) / 10000);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.emergencyWithdraw();
        assertEq(usdc.balanceOf(alice) - before, STAKE, "full principal recoverable once positions are unwound");
        assertEq(arbi.totalArbitrageDeployed(), 0);
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

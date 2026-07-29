// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV2 } from "../../src/ArbiSmartV2.sol";
import { Handler, InvariantTestUSDC, InvariantMockCTF } from "./Handler.sol";

/// @notice Invariant tests for ArbiSmartV2's staking accounting, partner
///         governance, and arbitrage capital tracking.
///         Run with `forge test --match-contract ArbiSmartV2InvariantTest`.
contract ArbiSmartV2InvariantTest is Test {
    ArbiSmartV2 internal arbi;
    InvariantTestUSDC internal usdc;
    Handler internal handler;

    address internal constant CTF_ADDRESS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    address internal owner = makeAddr("owner");
    address internal feeWallet1 = makeAddr("feeWallet1");
    address internal feeWallet2 = makeAddr("feeWallet2");
    address internal profitRecipient = makeAddr("profitRecipient");

    function setUp() public {
        usdc = new InvariantTestUSDC();
        arbi = new ArbiSmartV2(address(usdc), owner, feeWallet1, feeWallet2, profitRecipient);

        InvariantMockCTF impl = new InvariantMockCTF();
        vm.etch(CTF_ADDRESS, address(impl).code);

        vm.warp(block.timestamp + 25 hours); // clear the free-period window

        handler = new Handler(arbi, usdc, owner);

        targetContract(address(handler));
    }

    /// @dev Direct regression guard for the exact bug the hardened rewrite
    ///      fixed: no stake that has ever been earlyExited may retain a
    ///      nonzero `amount` — if this ever fails, the "claim after
    ///      earlyExit" fund-drain path has come back.
    function invariant_earlyExitedStakesAreAlwaysZeroed() public view {
        for (uint256 i = 0; i < 6; i++) {
            address actor = handler.actors(i);
            (uint256 amount,,,,,,, bool earlyExited,) = arbi.stakes(actor);
            if (earlyExited) {
                assertEq(amount, 0, "an early-exited stake must have amount == 0");
            }
        }
    }

    /// @dev The contract's own principal ledger must never claim more than
    ///      the handler believes was ever staked (a solvency-direction sanity
    ///      check; it does not assert profitability, only that the ledger
    ///      isn't lying).
    function invariant_totalStakedNeverExceedsHandlerGhostSum() public view {
        assertLe(
            arbi.totalStaked(),
            handler.ghost_sumActiveStakes(),
            "totalStaked must never exceed the sum of amounts the handler believes are staked"
        );
    }

    // ============================================================
    // Partner governance
    // ============================================================

    /// @dev The registry can never exceed its fixed capacity, and every slot
    ///      below `partnerCount` must hold a real, distinct address — the
    ///      swap-and-pop in removePartner is the thing most likely to break
    ///      this.
    function invariant_partnerRegistryIsWellFormed() public view {
        uint256 partnerCount = arbi.partnerCount();
        assertLe(partnerCount, arbi.MAX_PARTNERS(), "partnerCount must never exceed MAX_PARTNERS");

        for (uint256 i = 0; i < partnerCount; i++) {
            address partner = arbi.partners(i);
            assertTrue(partner != address(0), "live partner slot must not be zero");
            assertTrue(partner != arbi.owner(), "owner must never be registered as a partner");
            for (uint256 j = i + 1; j < partnerCount; j++) {
                assertTrue(partner != arbi.partners(j), "partner registry must not contain duplicates");
            }
        }
    }

    /// @dev Votes are only ever castable by members of the voting body, so
    ///      the tally can never exceed its size (owner + partners).
    function invariant_voteCountNeverExceedsVotingBody() public view {
        assertLe(
            arbi.emergencyVoteCount(), arbi.partnerCount() + 1, "vote tally cannot exceed owner + registered partners"
        );
    }

    /// @dev Emergency mode is only reachable at or above the threshold, and
    ///      entering it must always pause the contract — emergencyWithdraw
    ///      requires `paused()`, so an unpaused emergency would be an escape
    ///      hatch that silently does not open.
    function invariant_emergencyModeImpliesPausedAndQuorum() public view {
        if (arbi.emergencyMode()) {
            assertTrue(arbi.paused(), "emergency mode must imply paused");
            assertGe(arbi.emergencyVoteCount(), arbi.REQUIRED_VOTES(), "emergency mode must imply quorum");
            assertGt(arbi.emergencyActivatedAt(), 0, "emergency mode must record its activation time");
        } else {
            assertEq(arbi.emergencyActivatedAt(), 0, "inactive emergency must have no activation timestamp");
        }
    }

    // ============================================================
    // Arbitrage capital accounting
    // ============================================================

    /// @dev `totalArbitrageDeployed` is maintained separately from the
    ///      per-condition mapping, so the two must agree. This is the real
    ///      check on the release-clamping arithmetic in
    ///      executePolymarketMerge: an over-merge that released more than was
    ///      committed would desynchronize these (or revert on underflow).
    function invariant_deployedEqualsSumOfCommitments() public view {
        uint256 summed;
        for (uint256 i = 0; i < 3; i++) {
            summed += arbi.committedByCondition(handler.conditionAt(i));
        }
        assertEq(summed, arbi.totalArbitrageDeployed(), "totalArbitrageDeployed must equal the sum of commitments");
    }

    /// @dev The deployment budget must always be at least the flat balance
    ///      cap — the profit surplus can only ever add to it, never subtract.
    function invariant_arbitrageBudgetNeverBelowFlatCap() public view {
        uint256 flatCap = (usdc.balanceOf(address(arbi)) * 2000) / 10000;
        assertGe(arbi.polymarketArbitrageAvailable(), flatCap, "profit surplus must never reduce the budget");
        assertEq(
            arbi.polymarketArbitrageAvailable(),
            flatCap + arbi.arbitrageProfitSurplus(),
            "budget must be exactly flat cap plus undeployed profit"
        );
    }
}

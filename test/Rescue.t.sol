// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV2 } from "../src/ArbiSmartV2.sol";
import { TestUSDC, MockConditionalTokens } from "./ArbiSmartV2.t.sol";

/// @notice Tests for the partner-gated, time-delayed emergency fund rescue.
contract RescueTest is Test {
    ArbiSmartV2 internal arbi;
    TestUSDC internal usdc;

    address internal constant CTF_ADDRESS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    address internal owner = makeAddr("owner");
    address internal feeWallet1 = makeAddr("feeWallet1");
    address internal feeWallet2 = makeAddr("feeWallet2");
    address internal profitRecipient = makeAddr("profitRecipient");
    address internal recovery = makeAddr("recoveryWallet");
    address internal attackerWallet = makeAddr("attackerWallet");
    address internal alice = makeAddr("alice");
    address internal p1 = makeAddr("partner1");
    address internal p2 = makeAddr("partner2");
    address internal p3 = makeAddr("partner3");

    uint256 internal constant STAKE = 1000_000000;

    function setUp() public {
        usdc = new TestUSDC();
        arbi = new ArbiSmartV2(address(usdc), owner, feeWallet1, feeWallet2, profitRecipient);

        MockConditionalTokens impl = new MockConditionalTokens();
        vm.etch(CTF_ADDRESS, address(impl).code);

        vm.warp(block.timestamp + 25 hours);

        usdc.mint(alice, 100_000_000000);
        vm.prank(alice, alice);
        usdc.approve(address(arbi), type(uint256).max);
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.startPrank(owner);
        arbi.setRecoveryWallet(recovery);
        arbi.addPartner(p1);
        arbi.addPartner(p2);
        arbi.addPartner(p3);
        vm.stopPrank();
    }

    function _reachQuorum() internal {
        vm.prank(p1);
        arbi.voteRescue();
        vm.prank(p2);
        arbi.voteRescue();
        vm.prank(p3);
        arbi.voteRescue();
    }

    // ============================================================
    // The core protection: a stolen owner key alone cannot drain
    // ============================================================

    function test_ownerAloneCannotRescue() public {
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.RescueNotArmed.selector);
        arbi.executeRescue();

        // Even after casting the owner's own vote, one vote is not quorum.
        vm.startPrank(owner);
        arbi.voteRescue();
        vm.expectRevert(ArbiSmartV2.RescueNotArmed.selector);
        arbi.executeRescue();
        vm.stopPrank();

        assertEq(usdc.balanceOf(recovery), 0);
    }

    function test_compromisedOwnerCannotRepointDestinationMidVote() public {
        _reachQuorum();

        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.RescueVotePending.selector);
        arbi.setRecoveryWallet(attackerWallet);

        assertEq(arbi.recoveryWallet(), recovery, "destination stays where partners approved it");
    }

    function test_rescueRevertsBeforeDelayElapses() public {
        _reachQuorum();

        vm.warp(block.timestamp + arbi.RESCUE_DELAY() - 1);

        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.RescueDelayNotElapsed.selector);
        arbi.executeRescue();
    }

    // ============================================================
    // Arming and executing
    // ============================================================

    function test_quorumArmsRescueAndOpensStakerExit() public {
        _reachQuorum();

        assertEq(arbi.rescueVoteCount(), arbi.REQUIRED_VOTES());
        assertEq(arbi.rescueInitiatedAt(), block.timestamp);
        assertEq(arbi.rescueExecutableAt(), block.timestamp + arbi.RESCUE_DELAY());

        // Arming a sweep must also open the stakers' own escape hatch.
        assertTrue(arbi.emergencyMode(), "rescue quorum must activate emergency mode");
        assertTrue(arbi.paused());
    }

    function test_executeRescueSweepsRemainderToRecoveryWallet() public {
        _reachQuorum();
        vm.warp(block.timestamp + arbi.RESCUE_DELAY());

        assertTrue(arbi.rescueReady());

        uint256 poolBalance = usdc.balanceOf(address(arbi));
        vm.prank(owner);
        arbi.executeRescue();

        assertEq(usdc.balanceOf(recovery), poolBalance, "entire remaining balance swept");
        assertEq(usdc.balanceOf(address(arbi)), 0);
    }

    function test_executeRescue_onlyOwner() public {
        _reachQuorum();
        vm.warp(block.timestamp + arbi.RESCUE_DELAY());

        vm.prank(p1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", p1));
        arbi.executeRescue();
    }

    function test_executeRescue_revertsWithoutRecoveryWallet() public {
        // Fresh contract with no recovery wallet configured.
        ArbiSmartV2 fresh = new ArbiSmartV2(address(usdc), owner, feeWallet1, feeWallet2, profitRecipient);
        vm.startPrank(owner);
        fresh.addPartner(p1);
        fresh.addPartner(p2);
        fresh.addPartner(p3);
        vm.stopPrank();

        vm.prank(p1);
        fresh.voteRescue();
        vm.prank(p2);
        fresh.voteRescue();
        vm.prank(p3);
        fresh.voteRescue();

        vm.warp(block.timestamp + fresh.RESCUE_DELAY());

        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.NoRecoveryWallet.selector);
        fresh.executeRescue();
    }

    // ============================================================
    // Stakers get a head start on their own principal
    // ============================================================

    /// @dev The whole point of RESCUE_DELAY > EMERGENCY_DELAY: a staker can
    ///      always pull their full principal out before the sweep can fire.
    function test_stakerCanExitFullyBeforeSweepBecomesPossible() public {
        _reachQuorum();

        assertLt(arbi.EMERGENCY_DELAY(), arbi.RESCUE_DELAY(), "stakers must get the earlier window");

        vm.warp(block.timestamp + arbi.EMERGENCY_DELAY());

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.emergencyWithdraw();
        assertEq(usdc.balanceOf(alice) - before, STAKE, "full principal, no penalty, before any sweep");

        // Only after that does the sweep become possible at all.
        assertFalse(arbi.rescueReady());
    }

    // ============================================================
    // Revocation
    // ============================================================

    function test_revokeDisarmsRescueButKeepsStakerExitOpen() public {
        _reachQuorum();
        assertGt(arbi.rescueInitiatedAt(), 0);

        vm.prank(p1);
        arbi.revokeRescueVote();

        assertEq(arbi.rescueInitiatedAt(), 0, "sweep disarmed");
        assertTrue(arbi.emergencyMode(), "stakers keep the exit they were already promised");
    }

    /// @dev Revoking a rescue is the safety-increasing direction, so unlike
    ///      revokeEmergencyVote it must never become irrevocable.
    function test_revokeStaysAvailableAfterTheDelayElapses() public {
        _reachQuorum();
        vm.warp(block.timestamp + arbi.RESCUE_DELAY() + 10 days);

        vm.prank(p1);
        arbi.revokeRescueVote(); // must NOT revert

        assertFalse(arbi.rescueReady());

        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.RescueNotArmed.selector);
        arbi.executeRescue();
    }

    function test_voteRescue_rejectsNonVotersAndDoubleVotes() public {
        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV2.NotAVoter.selector);
        arbi.voteRescue();

        vm.startPrank(p1);
        arbi.voteRescue();
        vm.expectRevert(ArbiSmartV2.AlreadyVotedRescue.selector);
        arbi.voteRescue();
        vm.stopPrank();
    }

    function test_setRecoveryWallet_rejectsZeroAndNonOwner() public {
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.ZeroAddress.selector);
        arbi.setRecoveryWallet(address(0));

        vm.prank(alice, alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        arbi.setRecoveryWallet(attackerWallet);
    }
}

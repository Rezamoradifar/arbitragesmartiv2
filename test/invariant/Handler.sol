// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV2 } from "../../src/ArbiSmartV2.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract InvariantTestUSDC is ERC20 {
    constructor() ERC20("Invariant Test USDC", "itUSDC") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Stand-in for Polymarket's Conditional Tokens Framework, etched at
///         the real mainnet address by the invariant harness so that split
///         and merge actually move collateral.
contract InvariantMockCTF {
    function splitPosition(IERC20 collateralToken, bytes32, bytes32, uint256[] calldata, uint256 amount) external {
        collateralToken.transferFrom(msg.sender, address(this), amount);
    }

    function mergePositions(IERC20 collateralToken, bytes32, bytes32, uint256[] calldata, uint256 amount) external {
        collateralToken.transfer(msg.sender, amount);
    }

    function redeemPositions(IERC20, bytes32, bytes32, uint256[] calldata) external { }

    function balanceOf(address, uint256) external pure returns (uint256) {
        return 0;
    }
}

/// @notice Bounded, randomized-action handler for ArbiSmartV2 invariant
///         testing. Covers the user-facing staking/referral surface, the
///         partner-governance surface added in this repo, and the arbitrage
///         split/merge accounting (against an etched mock Conditional Tokens
///         contract, so collateral genuinely leaves and returns).
contract Handler is Test {
    ArbiSmartV2 public arbi;
    InvariantTestUSDC public usdc;
    address public owner;

    address[] public actors;
    address[] public candidatePartners;

    /// @dev The fixed condition-ID universe the handler may trade against.
    ///      Bounded so the invariant suite can sum {committedByCondition}
    ///      across every condition that could possibly be nonzero.
    bytes32[3] public conditions = [bytes32("cond-a"), bytes32("cond-b"), bytes32("cond-c")];

    uint256 public ghost_sumActiveStakes;

    constructor(ArbiSmartV2 _arbi, InvariantTestUSDC _usdc, address _owner) {
        arbi = _arbi;
        usdc = _usdc;
        owner = _owner;

        for (uint256 i = 0; i < 6; i++) {
            address actor = address(uint160(uint256(keccak256(abi.encodePacked("actor", i)))));
            actors.push(actor);
            usdc.mint(actor, 1_000_000_000000); // 1,000,000 itUSDC each
            vm.prank(actor, actor);
            usdc.approve(address(arbi), type(uint256).max);
        }

        // Six candidates for four slots, so the registry churns.
        for (uint256 i = 0; i < 6; i++) {
            candidatePartners.push(address(uint160(uint256(keccak256(abi.encodePacked("partner", i))))));
        }
    }

    function conditionAt(uint256 index) external view returns (bytes32) {
        return conditions[index];
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    /// @dev Picks from the owner + registered partners, i.e. the voting body.
    function _voter(uint256 seed) internal view returns (address) {
        uint256 partnerCount = arbi.partnerCount();
        uint256 pick = seed % (partnerCount + 1);
        if (pick == 0) return owner;
        return arbi.partners(pick - 1);
    }

    // ============================================================
    // Staking surface
    // ============================================================

    function stake(uint256 actorSeed, uint256 amount) external {
        address actor = _actor(actorSeed);
        (,,,,,, bool active, bool earlyExited,) = arbi.stakes(actor);
        if (active || earlyExited) return; // one stake per actor per lifetime, by design

        amount = bound(amount, 10_000000, 25_000_000000);
        if (arbi.isFreePeriod()) return; // skip free-period edge case in the handler for simplicity

        vm.prank(actor, actor);
        try arbi.stake(amount, address(0)) {
            ghost_sumActiveStakes += amount;
        } catch { }
    }

    function claim(uint256 actorSeed, uint256 warpSeed) external {
        address actor = _actor(actorSeed);
        vm.warp(block.timestamp + bound(warpSeed, 1 hours, 5 days));
        vm.prank(actor, actor);
        try arbi.claim() { } catch { }
    }

    function earlyExit(uint256 actorSeed) external {
        address actor = _actor(actorSeed);
        (uint256 amount,,,,,, bool active,,) = arbi.stakes(actor);
        if (!active) return;
        vm.prank(actor, actor);
        try arbi.earlyExit() {
            ghost_sumActiveStakes -= amount;
        } catch { }
    }

    function claimRef(uint256 actorSeed) external {
        address actor = _actor(actorSeed);
        vm.prank(actor, actor);
        try arbi.claimRef() { } catch { }
    }

    // ============================================================
    // Partner governance surface
    // ============================================================

    function addPartner(uint256 seed) external {
        address candidate = candidatePartners[seed % candidatePartners.length];
        vm.prank(owner);
        try arbi.addPartner(candidate) { } catch { }
    }

    function removePartner(uint256 seed) external {
        uint256 partnerCount = arbi.partnerCount();
        if (partnerCount == 0) return;
        vm.prank(owner);
        try arbi.removePartner(seed % partnerCount) { } catch { }
    }

    function voteEmergency(uint256 seed) external {
        vm.prank(_voter(seed));
        try arbi.voteEmergency() { } catch { }
    }

    function revokeEmergencyVote(uint256 seed) external {
        vm.prank(_voter(seed));
        try arbi.revokeEmergencyVote() { } catch { }
    }

    function warp(uint256 warpSeed) external {
        vm.warp(block.timestamp + bound(warpSeed, 1 hours, 10 days));
    }

    // ============================================================
    // Arbitrage surface
    // ============================================================

    function splitPosition(uint256 conditionSeed, uint256 amount) external {
        bytes32 conditionId = conditions[conditionSeed % conditions.length];
        uint256 available = arbi.polymarketArbitrageAvailable();
        if (available == 0) return;
        amount = bound(amount, 1, available);

        uint256[] memory partition = new uint256[](2);
        partition[0] = 1;
        partition[1] = 2;

        vm.prank(owner);
        try arbi.executePolymarketSplit(conditionId, partition, amount) { } catch { }
    }

    function mergePosition(uint256 conditionSeed, uint256 amount) external {
        bytes32 conditionId = conditions[conditionSeed % conditions.length];
        uint256 held = usdc.balanceOf(arbi.POLYMARKET_CONDITIONAL_TOKENS());
        if (held == 0) return;
        // Deliberately allowed to exceed this condition's own commitment, so
        // the release-clamping path in executePolymarketMerge is exercised.
        amount = bound(amount, 1, held);

        uint256[] memory partition = new uint256[](2);
        partition[0] = 1;
        partition[1] = 2;

        vm.prank(owner);
        try arbi.executePolymarketMerge(conditionId, partition, amount) { } catch { }
    }
}

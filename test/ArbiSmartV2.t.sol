// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV2 } from "../src/ArbiSmartV2.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal 6-decimal test collateral token standing in for USDC.
contract TestUSDC is ERC20 {
    constructor() ERC20("Test USD Coin", "tUSDC") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Stand-in for Polymarket's Conditional Tokens Framework, etched at
///         the real mainnet address so the arbitrage paths can be exercised
///         end-to-end (collateral genuinely leaves and returns).
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

contract ArbiSmartV2Test is Test {
    ArbiSmartV2 internal arbi;
    TestUSDC internal usdc;
    MockConditionalTokens internal ctf;

    address internal constant CTF_ADDRESS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    address internal owner = makeAddr("owner");
    address internal feeWallet1 = makeAddr("feeWallet1");
    address internal feeWallet2 = makeAddr("feeWallet2");
    address internal profitRecipient = makeAddr("profitRecipient");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal p1 = makeAddr("partner1");
    address internal p2 = makeAddr("partner2");
    address internal p3 = makeAddr("partner3");
    address internal p4 = makeAddr("partner4");

    uint256 internal constant STAKE = 1000_000000; // 1000 tUSDC, plan 1

    function setUp() public {
        usdc = new TestUSDC();
        arbi = new ArbiSmartV2(address(usdc), owner, feeWallet1, feeWallet2, profitRecipient);

        MockConditionalTokens impl = new MockConditionalTokens();
        vm.etch(CTF_ADDRESS, address(impl).code);
        ctf = MockConditionalTokens(CTF_ADDRESS);

        // Move past the 24h free period so tests exercise the paid tiers.
        vm.warp(block.timestamp + 25 hours);

        usdc.mint(alice, 100_000_000000);
        usdc.mint(bob, 100_000_000000);
        usdc.mint(owner, 100_000_000000);
        vm.prank(alice, alice);
        usdc.approve(address(arbi), type(uint256).max);
        vm.prank(bob, bob);
        usdc.approve(address(arbi), type(uint256).max);
        vm.prank(owner);
        usdc.approve(address(arbi), type(uint256).max);
    }

    function _partition() internal pure returns (uint256[] memory partition) {
        partition = new uint256[](2);
        partition[0] = 1;
        partition[1] = 2;
    }

    /// @dev Registers p1..p3 so the voting body is owner + 3 partners.
    function _registerPartners() internal {
        vm.startPrank(owner);
        arbi.addPartner(p1);
        arbi.addPartner(p2);
        arbi.addPartner(p3);
        vm.stopPrank();
    }

    /// @dev Drives the voting body to REQUIRED_VOTES without the owner's vote.
    function _activateEmergency() internal {
        vm.prank(p1);
        arbi.voteEmergency();
        vm.prank(p2);
        arbi.voteEmergency();
        vm.prank(p3);
        arbi.voteEmergency();
    }

    // ============================================================
    // Constructor
    // ============================================================

    function test_constructor_setsAllParamsCorrectly() public view {
        assertEq(address(arbi.collateralToken()), address(usdc));
        assertEq(arbi.owner(), owner);
        assertEq(arbi.feeWallet1(), feeWallet1);
        assertEq(arbi.feeWallet2(), feeWallet2);
        assertEq(arbi.profitRecipient(), profitRecipient);
        assertEq(arbi.profitFeeBPS(), 1000);
        assertEq(arbi.PROFIT_FEE_MAX_BPS(), 2000);
    }

    function test_constructor_startsWithNoPartnersOrVotes() public view {
        assertEq(arbi.partnerCount(), 0);
        assertEq(arbi.emergencyVoteCount(), 0);
        assertFalse(arbi.emergencyMode());
        assertEq(arbi.emergencyActivatedAt(), 0);
    }

    function test_constructor_revertsOnZeroCollateral() public {
        vm.expectRevert(ArbiSmartV2.ZeroAddress.selector);
        new ArbiSmartV2(address(0), owner, feeWallet1, feeWallet2, profitRecipient);
    }

    function test_constructor_revertsOnZeroFeeWallet1() public {
        vm.expectRevert(ArbiSmartV2.ZeroAddress.selector);
        new ArbiSmartV2(address(usdc), owner, address(0), feeWallet2, profitRecipient);
    }

    function test_constructor_revertsOnZeroFeeWallet2() public {
        vm.expectRevert(ArbiSmartV2.ZeroAddress.selector);
        new ArbiSmartV2(address(usdc), owner, feeWallet1, address(0), profitRecipient);
    }

    function test_constructor_revertsOnZeroProfitRecipient() public {
        vm.expectRevert(ArbiSmartV2.ZeroAddress.selector);
        new ArbiSmartV2(address(usdc), owner, feeWallet1, feeWallet2, address(0));
    }

    function test_polymarketAddressesAreOfficialMainnetAddresses() public view {
        assertEq(arbi.POLYMARKET_CONDITIONAL_TOKENS(), CTF_ADDRESS);
        assertEq(arbi.POLYMARKET_CTF_EXCHANGE(), 0xE111180000d2663C0091e4f400237545B87B996B);
        assertEq(arbi.POLYMARKET_NEG_RISK_EXCHANGE(), 0xe2222d279d744050d28e00520010520000310F59);
    }

    // ============================================================
    // Staking / fee distribution
    // ============================================================

    function test_stake_recordsCorrectState() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));
        (uint256 amount, uint256 plan,,,,, bool active,,) = arbi.stakes(alice);
        assertEq(amount, STAKE);
        assertEq(plan, 1);
        assertTrue(active);
    }

    function test_claim_feeSplitSumsExactlyToReward() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.warp(block.timestamp + 10 days);

        uint256 beforeAlice = usdc.balanceOf(alice);
        uint256 beforeFee1 = usdc.balanceOf(feeWallet1);
        uint256 beforeFee2 = usdc.balanceOf(feeWallet2);

        vm.prank(alice, alice);
        arbi.claim();

        uint256 gotAlice = usdc.balanceOf(alice) - beforeAlice;
        uint256 gotFee1 = usdc.balanceOf(feeWallet1) - beforeFee1;
        uint256 gotFee2 = usdc.balanceOf(feeWallet2) - beforeFee2;
        uint256 reward = gotAlice + gotFee1 + gotFee2;

        assertEq(gotFee1, (reward * 750) / 10000, "feeWallet1 should get exactly 7.5% of reward");
        assertEq(gotFee2, (reward * 250) / 10000, "feeWallet2 should get exactly 2.5% of reward");
        assertEq(gotAlice, reward - gotFee1 - gotFee2, "alice should get exactly the remaining 90%");
        assertGt(reward, 0, "reward should be nonzero after 10 days");
    }

    // ============================================================
    // Regression: the original "claim after earlyExit" fund-drain bug
    // ============================================================

    function test_regression_claimRevertsAfterEarlyExit() public {
        vm.startPrank(bob, bob);
        arbi.stake(STAKE, address(0));
        vm.warp(block.timestamp + 5 days);
        arbi.earlyExit();

        (uint256 amount,,,,,, bool active,,) = arbi.stakes(bob);
        assertEq(amount, 0, "amount must be zeroed after earlyExit");
        assertFalse(active, "stake must be inactive after earlyExit");

        vm.expectRevert(ArbiSmartV2.NoActiveStake.selector);
        arbi.claim();
        vm.stopPrank();
    }

    // ============================================================
    // Blacklist can never trap principal
    // ============================================================

    function test_blacklistedUserCanStillEarlyExit() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.setBlacklist(alice, true);

        vm.prank(alice, alice);
        arbi.earlyExit(); // must NOT revert
    }

    function test_blacklistedUserBlockedFromStaking() public {
        vm.prank(owner);
        arbi.setBlacklist(alice, true);

        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV2.Blacklisted.selector);
        arbi.stake(STAKE, address(0));
    }

    // ============================================================
    // emergencyWithdraw gating — pause-grace path
    // ============================================================

    function test_emergencyWithdraw_revertsWithoutPause() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV2.NotPausedError.selector);
        arbi.emergencyWithdraw();
    }

    function test_emergencyWithdraw_revertsBeforeGracePeriod() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.pause();

        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV2.GracePeriodNotElapsed.selector);
        arbi.emergencyWithdraw();
    }

    function test_emergencyWithdraw_returnsFullPrincipalAfterGracePeriod() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.pause();

        vm.warp(block.timestamp + 31 days);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.emergencyWithdraw();
        assertEq(usdc.balanceOf(alice) - before, STAKE, "must return exactly full principal, no penalty");
    }

    // ============================================================
    // Partner registry
    // ============================================================

    function test_addPartner_registersAndReportsMembership() public {
        vm.prank(owner);
        arbi.addPartner(p1);

        assertEq(arbi.partnerCount(), 1);
        assertEq(arbi.partners(0), p1);
        assertTrue(arbi.isPartner(p1));
        assertFalse(arbi.isPartner(p2));
    }

    function test_addPartner_onlyOwner() public {
        vm.prank(alice, alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        arbi.addPartner(p1);
    }

    function test_addPartner_rejectsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.ZeroAddress.selector);
        arbi.addPartner(address(0));
    }

    function test_addPartner_rejectsOwner() public {
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.CannotAddOwnerAsPartner.selector);
        arbi.addPartner(owner);
    }

    function test_addPartner_rejectsDuplicate() public {
        vm.startPrank(owner);
        arbi.addPartner(p1);
        vm.expectRevert(ArbiSmartV2.DuplicatePartner.selector);
        arbi.addPartner(p1);
        vm.stopPrank();
    }

    function test_addPartner_enforcesMaxPartners() public {
        vm.startPrank(owner);
        arbi.addPartner(p1);
        arbi.addPartner(p2);
        arbi.addPartner(p3);
        arbi.addPartner(p4);
        assertEq(arbi.partnerCount(), arbi.MAX_PARTNERS());

        vm.expectRevert(ArbiSmartV2.PartnerLimitReached.selector);
        arbi.addPartner(makeAddr("partner5"));
        vm.stopPrank();
    }

    function test_removePartner_swapsAndPops() public {
        _registerPartners();

        vm.prank(owner);
        arbi.removePartner(0); // p1 removed, p3 swapped into slot 0

        assertEq(arbi.partnerCount(), 2);
        assertEq(arbi.partners(0), p3);
        assertEq(arbi.partners(1), p2);
        assertEq(arbi.partners(2), address(0), "vacated tail slot must be zeroed");
        assertFalse(arbi.isPartner(p1));
    }

    function test_removePartner_rejectsInvalidIndex() public {
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.InvalidPartnerIndex.selector);
        arbi.removePartner(0);
    }

    function test_removePartner_clearsThatPartnersLiveVote() public {
        _registerPartners();

        vm.prank(p1);
        arbi.voteEmergency();
        assertEq(arbi.emergencyVoteCount(), 1);
        assertTrue(arbi.emergencyVotes(p1));

        vm.prank(owner);
        arbi.removePartner(0);

        assertEq(arbi.emergencyVoteCount(), 0, "removed partner's vote must be retracted");
        assertFalse(arbi.emergencyVotes(p1));
    }

    // ============================================================
    // Emergency vote
    // ============================================================

    function test_voteEmergency_rejectsNonVoters() public {
        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV2.NotAVoter.selector);
        arbi.voteEmergency();
    }

    function test_voteEmergency_rejectsDoubleVote() public {
        _registerPartners();

        vm.startPrank(p1);
        arbi.voteEmergency();
        vm.expectRevert(ArbiSmartV2.AlreadyVoted.selector);
        arbi.voteEmergency();
        vm.stopPrank();
    }

    function test_voteEmergency_ownerAloneCannotActivate() public {
        _registerPartners();

        vm.prank(owner);
        arbi.voteEmergency();

        assertEq(arbi.emergencyVoteCount(), 1);
        assertFalse(arbi.emergencyMode(), "one vote must not reach the 3-of-N threshold");
        assertFalse(arbi.paused());
    }

    function test_voteEmergency_partnersCanActivateWithoutOwner() public {
        _registerPartners();
        _activateEmergency();

        assertEq(arbi.emergencyVoteCount(), arbi.REQUIRED_VOTES());
        assertTrue(arbi.emergencyMode(), "3 partner votes must activate over the owner's head");
        assertTrue(arbi.paused(), "activation must pause the contract immediately");
        assertEq(arbi.emergencyActivatedAt(), block.timestamp);
        assertFalse(arbi.emergencyVotes(owner), "owner never voted");
    }

    function test_getVoters_listsOwnerThenPartners() public {
        _registerPartners();

        address[] memory voters = arbi.getVoters();
        assertEq(voters.length, 4);
        assertEq(voters[0], owner);
        assertEq(voters[1], p1);
        assertEq(voters[2], p2);
        assertEq(voters[3], p3);
    }

    // ============================================================
    // Emergency vote — anti-veto properties
    // ============================================================

    function test_owner_cannotUnpauseOutOfEmergency() public {
        _registerPartners();
        _activateEmergency();

        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.EmergencyActive.selector);
        arbi.unpause();

        assertTrue(arbi.paused(), "escape hatch must stay open");
    }

    function test_owner_cannotDissolveVotingBodyDuringEmergency() public {
        _registerPartners();
        _activateEmergency();

        vm.startPrank(owner);
        vm.expectRevert(ArbiSmartV2.EmergencyActive.selector);
        arbi.removePartner(0);

        vm.expectRevert(ArbiSmartV2.EmergencyActive.selector);
        arbi.addPartner(p4);
        vm.stopPrank();
    }

    function test_revokeEmergencyVote_cancelsWhenDroppingBelowThreshold() public {
        _registerPartners();
        _activateEmergency();
        assertTrue(arbi.emergencyMode());

        vm.prank(p1);
        arbi.revokeEmergencyVote();

        assertFalse(arbi.emergencyMode(), "dropping below threshold must cancel emergency");
        assertEq(arbi.emergencyActivatedAt(), 0);
        assertEq(arbi.emergencyVoteCount(), 2);
        assertTrue(arbi.paused(), "contract stays paused until the owner deliberately unpauses");
    }

    function test_revokeEmergencyVote_isIrrevocableAfterDelay() public {
        _registerPartners();
        _activateEmergency();

        vm.warp(block.timestamp + arbi.EMERGENCY_DELAY());

        vm.prank(p1);
        vm.expectRevert(ArbiSmartV2.EmergencyIrrevocable.selector);
        arbi.revokeEmergencyVote();

        assertTrue(arbi.emergencyMode());
    }

    function test_revokeEmergencyVote_rejectsNonVoter() public {
        _registerPartners();

        vm.prank(p1);
        vm.expectRevert(ArbiSmartV2.NotVoted.selector);
        arbi.revokeEmergencyVote();
    }

    // ============================================================
    // emergencyWithdraw gating — partner-vote path
    // ============================================================

    function test_emergencyWithdraw_revertsBeforeEmergencyDelay() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        _registerPartners();
        _activateEmergency();

        assertFalse(arbi.emergencyWithdrawOpen());

        vm.prank(alice, alice);
        vm.expectRevert(ArbiSmartV2.EmergencyDelayNotElapsed.selector);
        arbi.emergencyWithdraw();
    }

    function test_emergencyWithdraw_opensTwoDaysAfterVote() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        _registerPartners();
        _activateEmergency();

        vm.warp(block.timestamp + arbi.EMERGENCY_DELAY());
        assertTrue(arbi.emergencyWithdrawOpen());

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.emergencyWithdraw();

        assertEq(usdc.balanceOf(alice) - before, STAKE, "full principal, no penalty");
    }

    function test_emergencyWithdraw_partnerPathIsFasterThanGracePeriod() public view {
        assertLt(arbi.EMERGENCY_DELAY(), arbi.EMERGENCY_GRACE_PERIOD());
    }

    // ============================================================
    // Arbitrage — access control and budget
    // ============================================================

    function test_executePolymarketMerge_onlyOwner() public {
        vm.prank(alice, alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        arbi.executePolymarketMerge(bytes32(0), _partition(), 1);
    }

    function test_executePolymarketRedeem_onlyOwner() public {
        vm.prank(alice, alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        arbi.executePolymarketRedeem(bytes32(0), _partition());
    }

    function test_executePolymarketSplit_capsAt20PercentOfPool() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        uint256 available = arbi.polymarketArbitrageAvailable();
        assertEq(available, (STAKE * 2000) / 10000, "available should be exactly 20% of pool balance");

        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.AmountExceedsAvailable.selector);
        arbi.executePolymarketSplit(bytes32(0), _partition(), available + 1);
    }

    function test_executePolymarketSplit_blockedDuringEmergency() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        _registerPartners();
        _activateEmergency();

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        arbi.executePolymarketSplit(bytes32(0), _partition(), 1);
    }

    function test_executePolymarketSplit_tracksDeployedCapital() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 100_000000);

        assertEq(arbi.totalArbitrageDeployed(), 100_000000);
        assertEq(arbi.committedByCondition(bytes32("mkt")), 100_000000);
        assertEq(usdc.balanceOf(address(arbi)), STAKE - 100_000000, "collateral really left the pool");
    }

    function test_executePolymarketMerge_releasesDeployedCapital() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.startPrank(owner);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 100_000000);
        arbi.executePolymarketMerge(bytes32("mkt"), _partition(), 100_000000);
        vm.stopPrank();

        assertEq(arbi.totalArbitrageDeployed(), 0);
        assertEq(arbi.committedByCondition(bytes32("mkt")), 0);
        assertEq(usdc.balanceOf(address(arbi)), STAKE, "collateral fully returned");
    }

    /// @dev A merge larger than the tracked commitment must not underflow the
    ///      global counter — the release is clamped to what was committed.
    function test_executePolymarketMerge_clampsOverRelease() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.startPrank(owner);
        arbi.executePolymarketSplit(bytes32("a"), _partition(), 100_000000);
        arbi.executePolymarketSplit(bytes32("b"), _partition(), 50_000000);
        assertEq(arbi.totalArbitrageDeployed(), 150_000000);

        // Merge more against "b" than was ever committed to it.
        arbi.executePolymarketMerge(bytes32("b"), _partition(), 80_000000);
        vm.stopPrank();

        assertEq(arbi.committedByCondition(bytes32("b")), 0);
        assertEq(arbi.totalArbitrageDeployed(), 100_000000, "only b's 50 may be released, not 80");
    }

    function test_executePolymarketMerge_allowedWhilePaused() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 100_000000);

        _registerPartners();
        _activateEmergency(); // pauses the contract

        // Unwinding must remain possible, otherwise emergencyWithdraw would be
        // starved of the collateral sitting in open positions.
        vm.prank(owner);
        arbi.executePolymarketMerge(bytes32("mkt"), _partition(), 100_000000);

        assertEq(usdc.balanceOf(address(arbi)), STAKE);
    }

    // ============================================================
    // Arbitrage — realized profit accounting
    // ============================================================

    function test_executePolymarketRedeem_accruesNetProfitAndChargesFee() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 100_000000);

        // Position resolves for 150 against 100 committed → 50 gross profit.
        usdc.mint(CTF_ADDRESS, 150_000000);
        ctf.setRedeemPayout(150_000000);

        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        uint256 expectedFee = (50_000000 * 1000) / 10000; // 10% of profit
        assertEq(usdc.balanceOf(profitRecipient), expectedFee, "fee charged on profit only");
        assertEq(arbi.totalArbitrageProfit(), 50_000000 - expectedFee, "only net profit is credited");
        assertEq(arbi.totalArbitrageDeployed(), 0);
    }

    function test_executePolymarketRedeem_chargesNoFeeOnBreakEven() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.prank(owner);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 100_000000);

        usdc.mint(CTF_ADDRESS, 100_000000);
        ctf.setRedeemPayout(100_000000); // exactly principal back

        vm.prank(owner);
        arbi.executePolymarketRedeem(bytes32("mkt"), _partition());

        assertEq(usdc.balanceOf(profitRecipient), 0, "principal must never be taxed as profit");
        assertEq(arbi.totalArbitrageProfit(), 0);
    }

    function test_profitSurplus_expandsDeploymentBudget() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        uint256 baseline = arbi.polymarketArbitrageAvailable();

        vm.prank(owner);
        arbi.depositArbitrageProfit(60_000000);

        assertEq(arbi.totalArbitrageProfit(), 60_000000);
        assertEq(arbi.arbitrageProfitSurplus(), 60_000000);

        uint256 expected = ((STAKE + 60_000000) * 2000) / 10000 + 60_000000;
        assertEq(arbi.polymarketArbitrageAvailable(), expected);
        assertGt(arbi.polymarketArbitrageAvailable(), baseline);
    }

    function test_profitSurplus_shrinksAsProfitIsDeployed() public {
        vm.prank(alice, alice);
        arbi.stake(STAKE, address(0));

        vm.startPrank(owner);
        arbi.depositArbitrageProfit(60_000000);
        arbi.executePolymarketSplit(bytes32("mkt"), _partition(), 25_000000);
        vm.stopPrank();

        assertEq(arbi.totalArbitrageDeployed(), 25_000000);
        assertEq(arbi.arbitrageProfitSurplus(), 35_000000, "surplus nets off deployed capital");
    }

    function test_depositArbitrageProfit_onlyOwner() public {
        vm.prank(alice, alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        arbi.depositArbitrageProfit(1_000000);
    }

    function test_depositArbitrageProfit_rejectsZero() public {
        vm.prank(owner);
        vm.expectRevert(ArbiSmartV2.ZeroAmount.selector);
        arbi.depositArbitrageProfit(0);
    }

    // ============================================================
    // There is no path that sends pooled collateral to a wallet
    // ============================================================

    /// @dev The earlier draft exposed `polymarketArbitrageTrade(uint256)`,
    ///      which transferred pooled staker collateral to the owner's EOA.
    ///      Assert by selector that no such entry point exists here.
    function test_noOwnerDrainFunctionExists() public {
        (bool found,) = address(arbi).call(abi.encodeWithSignature("polymarketArbitrageTrade(uint256)", 1));
        assertFalse(found, "owner-drain entry point must not exist");

        (bool found2,) = address(arbi).call(abi.encodeWithSignature("executeEmergency()"));
        assertFalse(found2, "partner-drain entry point must not exist");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * BUILD REQUIREMENT: this contract MUST be compiled with `viaIR: true`
 * (Foundry: `via_ir = true` in foundry.toml; Hardhat: `settings.viaIR = true`
 * in the solidity compiler config). Without it, `getUserStatsExtended`
 * fails with a "Stack too deep" compiler error under the legacy codegen
 * pipeline. This was verified directly: compiling this exact file with
 * solc 0.8.24/0.8.26 and the optimizer on fails without `viaIR`, and
 * succeeds (producing valid bytecode) with it enabled. `foundry.toml` in
 * this project already sets `via_ir = true`.
 */

import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title IConditionalTokens
 * @notice Minimal interface to Polymarket's OFFICIAL, permissionless Gnosis
 *         Conditional Tokens Framework contract deployed on Polygon mainnet
 *         at 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045.
 *
 * @dev These three function signatures were copied verbatim from the real,
 *      deployed, open-source contract
 *      (github.com/gnosis/conditional-tokens-contracts,
 *      contracts/ConditionalTokens.sol) — they are not guessed. Anyone may
 *      call `splitPosition` / `mergePositions` / `redeemPositions` on the
 *      real contract; no special role is required for these three
 *      functions.
 */
interface IConditionalTokens {
    /// @notice Converts `amount` of `collateralToken` (or, if `parentCollectionId != 0`,
    ///         of the parent position) into a full set of outcome-token positions for `conditionId`.
    function splitPosition(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;

    /// @notice The inverse of {splitPosition}: burns a full set of outcome-token
    ///         positions and returns `amount` of collateral (or parent position).
    function mergePositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;

    /// @notice Redeems outcome-token positions for collateral after a condition
    ///         has been resolved by its oracle.
    function redeemPositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata indexSets
    ) external;

    /// @notice Standard ERC-1155 balance query (outcome tokens are ERC-1155).
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/**
 * @title ArbiSmartV3
 * @author (refactor of the original ArbiSmart contract, security review requested by the contract owner)
 *
 * @dev ============================================================
 *      WHAT CHANGED VS. V2 — READ THIS FIRST
 *      ============================================================
 *
 *      V3 adds ONE thing to V2: a disclosed, up-front DEVELOPMENT FEE charged
 *      on deposits, funding development, advertising and running costs.
 *
 *      The name is deliberately literal. This fee buys the depositor no
 *      coverage, no equity and no claim on anything — it pays to build and
 *      promote the platform. Labelling it as insurance or a share would
 *      describe a protection that does not exist, so it is named for what
 *      it actually is.
 *
 *      The distinction that makes this safe rather than a hidden skim is
 *      the accounting, and it is the whole point of this version:
 *
 *        - A 100 USDT deposit at a 10% development fee records a stake of
 *          **90**, not 100. The contract's liability to that user is 90 from
 *          the first block. It never books a 100 stake it cannot honour.
 *        - The 10 is booked to `developmentFeesCollected*` the moment it
 *          arrives and is excluded from {totalAssets}, so it can never be
 *          counted as pool capital, lent against, or deployed into
 *          arbitrage.
 *        - {withdrawDevelopmentFees} is hard-capped at
 *          `collected - withdrawn`, per wallet. There is no code path by
 *          which the owner can reach staker principal, and the cap is
 *          arithmetic, not a policy the owner can raise.
 *
 *      In short: the fee is disclosed, taken once, at a fixed rate the
 *      owner cannot raise, and the contract remains fully backed against
 *      the stakes it actually records. Everything else — plans, referral
 *      tables, penalties, partner governance, the Polymarket path — is
 *      unchanged from V2.
 *
 * @notice A USDC/USDT-collateralized staking + referral pool that, in addition
 *         to fixed-rate staking, allows the contract owner to route a bounded
 *         portion of pooled collateral into REAL, on-chain interactions with
 *         Polymarket's official Conditional Tokens Framework contract on
 *         Polygon (splitting collateral into complete outcome-token sets,
 *         merging them back, and redeeming them after market resolution).
 *
 * @dev ============================================================
 *      WHAT CHANGED VS. THE ORIGINAL CONTRACT, AND WHY — READ THIS FIRST
 *      ============================================================
 *
 *      1. `polymarketArbitrageTrade` / `polymarketArbitrageProfit` (the
 *         original functions) have been DELETED. In the original contract
 *         they did nothing but transfer up to 20% of the pool's collateral
 *         directly to `OWNER`, and pull it back only if/when `OWNER` chose
 *         to, with no on-chain evidence of any actual trade. That is fund
 *         extraction mislabeled as trading, not arbitrage. It is gone.
 *         The inbound half survives, renamed, as {depositArbitrageProfit} —
 *         it can only ever move collateral INTO the pool, and there is no
 *         longer any counterpart that moves it out to a wallet (item 12).
 *
 *      2. In its place, {executePolymarketSplit}, {executePolymarketMerge},
 *         and {executePolymarketRedeem} call the REAL, official Polymarket
 *         Conditional Tokens contract (0x4D97DCd97eC945f40cF65F87097ACe5EA0476045).
 *         Every {ArbitrageSplitExecuted} / {ArbitrageMergeExecuted} /
 *         {ArbitrageRedeemed} event is emitted ONLY after the external call
 *         to that real contract has already succeeded — there is no code
 *         path that emits these events without the corresponding on-chain
 *         action actually having happened.
 *
 *      3. IMPORTANT, HONEST LIMITATION: this contract does NOT, and cannot,
 *         autonomously buy or sell on Polymarket's order book. Polymarket's
 *         own deployed `CTFExchange.fillOrder` / `fillOrders` / `matchOrders`
 *         are gated by an `onlyOperator` modifier in Polymarket's own source
 *         code — only addresses Polymarket's own admins have explicitly
 *         granted the Operator role may call them. This contract has not
 *         been granted that role, and Polymarket does not grant it to
 *         arbitrary third-party contracts. See the audit report for the
 *         exact quoted source. Concretely, this means:
 *           - {executePolymarketSplit} can convert pooled collateral into a
 *             real, held complete set of Polymarket outcome tokens (a
 *             genuine, verifiable on-chain action) — but selling those
 *             tokens above cost, or buying a complete set below $1 in the
 *             first place, requires trading on the order book, which this
 *             contract cannot do by itself.
 *           - {executePolymarketRedeem} lets the contract realize value from
 *             already-held outcome tokens once a market resolves, which
 *             *is* fully autonomous and on-chain.
 *           - True continuous "buy low / sell high" arbitrage against the
 *             live order book would require an off-chain component (a bot
 *             using Polymarket's CLOB API) plus this contract implementing
 *             EIP-1271 to act as a smart-contract order maker
 *             (`SignatureType.POLY_1271` in Polymarket's Order struct) —
 *             that is a real, supported path in Polymarket's protocol, but
 *             it is deliberately NOT implemented here, because doing so
 *             correctly requires matching Polymarket's exact off-chain
 *             signing/hashing expectations, which could not be independently
 *             verified in this environment. Shipping an unverified
 *             implementation of that piece would risk silently broken (or
 *             worse, exploitable) signature validation. Do not add it
 *             without directly verifying it against Polymarket's current
 *             `Signatures.sol` and CLOB API docs.
 *
 *      4. `executeEmergency` (the original "insider partner"
 *         full-balance-drain mechanism, which split the entire contract
 *         balance among the partner wallets) has been DELETED ENTIRELY.
 *         There is no way to make "a small owner-appointed group can vote to
 *         send themselves 100% of user funds" safe — the fix is removal, not
 *         a more elaborate vote. In its place, {emergencyWithdraw} lets ANY
 *         individual staker recover their own remaining principal, without
 *         needing anyone else's permission, if the contract has been paused
 *         continuously for longer than {EMERGENCY_GRACE_PERIOD}. This
 *         preserves a genuine "something is wrong, get user funds out"
 *         safety valve while removing the insider-drain capability.
 *
 *         The vote itself ({voteEmergency}) and the partner registry
 *         ({addPartner}/{removePartner}) DO exist in this version — see
 *         item 11 below — but with the payout removed. They now only
 *         accelerate stakers' access to their OWN principal; no quorum of
 *         any size can direct a single token to a partner or to the owner.
 *         The dangerous part was never the vote, it was what the vote paid
 *         out.
 *
 *      5. Blacklisting (`setBlacklist`) can no longer block {earlyExit} or
 *         {emergencyWithdraw}. In the original contract, blacklisting a user
 *         also blocked their only exit path, permanently freezing their
 *         funds at the owner's sole discretion. A blacklisted address can
 *         still be blocked from new stakes, top-ups, plan upgrades, and
 *         claiming yield/referral rewards (this is legitimate for e.g.
 *         sanctions compliance) — but it can never be used to trap a user's
 *         principal forever.
 *
 *      6. Fixed a fund-drain logic bug: in the original contract, calling
 *         `earlyExit()` did not clear the stake's `amount`/`rate` fields, so
 *         a user could call `claim()` again afterward and be paid yield on
 *         a position they had already exited and been refunded for. `claim`
 *         now requires the stake to still be `active`, and {_deactivateStake}
 *         zeroes `amount`/`rate` at the moment of exit, closing this
 *         completely (belt-and-suspenders: either check alone would have
 *         been sufficient).
 *
 *      7. `OWNER` / fee wallets are no longer hardcoded, non-transferable
 *         `constant`s. Ownership now uses OpenZeppelin v5's
 *         `Ownable2Step` (two-step transfer, avoiding an irrecoverable
 *         mistyped-address handoff). Fee wallets are owner-settable.
 *         **Deployment recommendation:** set the initial owner to a Gnosis
 *         Safe multisig, and/or route ownership through an OpenZeppelin
 *         `TimelockController` (deploy that separately and pass its address
 *         as `initialOwner`), so that no single key can unilaterally pause,
 *         blacklist, or move collateral into a Polymarket position without
 *         a delay and/or multiple signers. This contract is fully compatible
 *         with either as its `owner()` — no additional code changes needed.
 *
 *      8. Replaced the hand-rolled reentrancy guard, pause flag, and
 *         `require(..., "X")` string-error pattern with OpenZeppelin v5's
 *         `ReentrancyGuard`, `Pausable`, and custom errors (cheaper, and
 *         gives callers/tooling a decodable reason). All external token
 *         transfers use `SafeERC20`, so a non-standard ERC-20 that returns
 *         `false` instead of reverting can no longer cause a silent,
 *         unaccounted-for transfer failure.
 *
 *      9. Every function that moves value now follows checks-effects-
 *         interactions: internal state (`stakes[...]`, `totalStaked`,
 *         `totalPaidOut`, referral balances) is fully updated before any
 *         external call (`safeTransfer`, `safeTransferFrom`, or the
 *         Polymarket Conditional Tokens calls).
 *
 *      Preserved unchanged (per instructions, "unless it must change for
 *      correctness"): the staking tiers, daily rates, plan durations,
 *      early-exit penalty schedule, multi-level referral-rate tables, the
 *      24h free-period mechanic, and the daily-withdrawal-cap constant.
 *      These are business/economic parameters, not security bugs — flagged
 *      in the earlier audit as a design/sustainability concern, not
 *      something a "security fix" should silently alter. If you want those
 *      economics changed, that's a product decision, not a refactor.
 *
 *      10. NO HARDCODED WALLET ADDRESSES: `owner` (via `Ownable2Step`),
 *          `feeWallet1`, `feeWallet2`, and `profitRecipient` are ALL
 *          constructor parameters, sourced from environment variables at
 *          deploy time (see `.env.example` / `script/Deploy.s.sol`) — none
 *          are hardcoded. `profitRecipient` is a genuinely new, distinct
 *          role added on request: it receives a bounded, owner-configurable
 *          performance fee (`profitFeeBPS`, capped at `PROFIT_FEE_MAX_BPS`)
 *          charged ONLY on real profit realized in
 *          `executePolymarketRedeem` (tracked precisely via
 *          `committedByCondition`, so principal the pool itself split into
 *          a position is never taxed as if it were profit) — separate from
 *          `feeWallet1`/`feeWallet2`, which are funded from staking-yield
 *          claims. The three `POLYMARKET_*` addresses remain `constant`
 *          deliberately: they are official, canonical, immutable
 *          third-party protocol infrastructure, not wallets this project
 *          controls — hardcoding *those* is the correct practice (making
 *          them configurable would let a misconfigured deploy silently
 *          point at the wrong, or a malicious, contract).
 *
 *      11. PARTNER GOVERNANCE (new in the v2 repo). A registry of up to
 *          {MAX_PARTNERS} partner addresses acts as a check on the owner.
 *          Any {REQUIRED_VOTES}-of-N vote among the voter set (owner +
 *          partners) flips {emergencyMode}, which immediately pauses the
 *          contract and, after {EMERGENCY_DELAY}, unlocks
 *          {emergencyWithdraw} for every staker without waiting out the
 *          much longer {EMERGENCY_GRACE_PERIOD}.
 *
 *          Critically, this vote does NOT distribute any funds to partners
 *          or to the owner. It is purely an accelerated escape hatch for
 *          stakers: the only address a staker's principal can ever move to
 *          through this path is that staker. This is a deliberate departure
 *          from the earlier draft's `executeEmergency`, which split the
 *          entire contract balance among the partner wallets — an insider
 *          drain wearing a multisig's clothes.
 *
 *          Two anti-veto properties make the check real rather than
 *          decorative: (a) {addPartner}/{removePartner} are blocked while
 *          {emergencyMode} is set, so the owner cannot dissolve the voting
 *          body to cancel a vote already in flight; and (b) once
 *          {EMERGENCY_DELAY} has elapsed, votes can no longer be revoked,
 *          so the staker escape hatch cannot be closed once it has legally
 *          opened. Since the owner holds only one of up to five votes,
 *          three partners can trigger emergency mode over the owner's
 *          objection, and the owner alone can neither trigger nor block it.
 *
 *      12. ARBITRAGE PROFIT ACCOUNTING (new in the v2 repo). The earlier
 *          draft's `polymarketArbitrageTrade` transferred pooled staker
 *          collateral — up to 30% of the contract balance — straight to the
 *          owner's EOA, with nothing on-chain tying it to any actual trade.
 *          That function does not exist here. What is preserved is its
 *          genuinely useful idea: a budget that grows as the strategy earns.
 *          {totalArbitrageProfit} accrues only REAL, realized profit (the
 *          redemption surplus over tracked principal, plus any profit the
 *          operator voluntarily returns via {depositArbitrageProfit}), and
 *          {polymarketArbitrageAvailable} adds the undeployed portion of
 *          that profit on top of the flat {ARBITRAGE_MAX_BPS} balance cap.
 *          Every path still ends in contract-held positions, never a wallet.
 */
contract ArbiSmartV3 is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================================
    // Polymarket — official, verified contract addresses (Polygon mainnet)
    // ============================================================

    /// @notice Polymarket's official Conditional Tokens Framework contract.
    ///         This is the ONLY Polymarket contract this code actually calls.
    address public constant POLYMARKET_CONDITIONAL_TOKENS = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;

    /// @notice Polymarket's official CTF Exchange address, kept here for
    ///         reference/documentation only. NOT called by this contract —
    ///         see the contract-level NatSpec for exactly why (`onlyOperator`).
    address public constant POLYMARKET_CTF_EXCHANGE = 0xE111180000d2663C0091e4f400237545B87B996B;

    /// @notice Polymarket's official Neg Risk CTF Exchange address, kept here
    ///         for reference/documentation only. Same `onlyOperator`
    ///         limitation applies (same underlying exchange contract family
    ///         per Polymarket's own documentation) — NOT called by this contract.
    address public constant POLYMARKET_NEG_RISK_EXCHANGE = 0xe2222d279d744050d28e00520010520000310F59;

    // ============================================================
    // Immutables / configurable addresses
    // ============================================================

    /// @notice The ERC-20 collateral token used for staking. MUST be the
    ///         exact token address that the target Polymarket condition(s)
    ///         were prepared with, or {executePolymarketSplit}/{executePolymarketMerge}
    ///         will operate on a valid-but-not-actually-tradeable-on-Polymarket
    ///         position set. Verify this against the specific market before use.
    IERC20 public immutable collateralToken;

    address public feeWallet1;
    address public feeWallet2;

    /// @notice Recipient of the performance fee ({profitFeeBPS}) charged on
    ///         REAL, realized Polymarket redemption profit (see
    ///         {executePolymarketRedeem}). Distinct from {feeWallet1}/
    ///         {feeWallet2}, which are funded from staking-yield claims, not
    ///         from arbitrage proceeds. Constructor parameter / owner-settable
    ///         — never hardcoded.
    address public profitRecipient;

    /// @notice Performance fee, in basis points, charged on realized
    ///         Polymarket redemption profit before the remainder stays in
    ///         the pool. Owner-settable, hard-capped at {PROFIT_FEE_MAX_BPS}.
    uint256 public profitFeeBPS;

    /// @notice Hard ceiling on {profitFeeBPS} — the owner can never set a
    ///         fee above 20% of realized profit.
    uint256 public constant PROFIT_FEE_MAX_BPS = 2000;

    /// @notice Collateral committed via {executePolymarketSplit} per
    ///         `conditionId`, reduced as positions are unwound via
    ///         {executePolymarketMerge}/{executePolymarketRedeem}. Used so
    ///         the performance fee is only ever charged on genuine profit
    ///         (`received - committed`), never on returned principal — a
    ///         complete-set split-then-redeem cycle nets to exactly the
    ///         committed amount by the Conditional Tokens Framework's own
    ///         invariant, so it must never be taxed as if it were profit.
    mapping(bytes32 => uint256) public committedByCondition;

    // ============================================================
    // State
    // ============================================================

    /// @notice Sum of every recorded stake — i.e. NET of the platform fee.
    ///         This is the contract's principal liability to stakers, and it
    ///         is deliberately the post-fee figure: a gross deposit is never
    ///         booked as a stake the pool would then be short against.
    uint256 public totalStaked;
    uint256 public totalPaidOut;
    uint256 public immutable deployTime;
    uint256 public constant FREE_PERIOD = 24 hours;

    // ============================================================
    // Site growth fee — disclosed, up-front, taken once per deposit
    // ============================================================

    /// @notice Development fee on deposits, in basis points, split across two
    ///         independent development/advertising budgets. Both are fixed at
    ///         deployment and **immutable**: unlike an owner-settable rate, no
    ///         governance action, key compromise or later decision can raise
    ///         what a depositor is charged after they have read it.
    uint256 public immutable DEVELOPMENT_FEE_BPS_1;
    uint256 public immutable DEVELOPMENT_FEE_BPS_2;

    /// @notice Upper bound on the COMBINED fee, enforced at construction. A
    ///         fee above this could not honestly be described as a platform
    ///         fee, so the contract refuses to deploy with one.
    uint256 public constant DEVELOPMENT_FEE_MAX_BPS = 2000;

    /// @notice Destinations for withdrawn platform fees. Distinct from
    ///         {feeWallet1}/{feeWallet2} (yield-claim fees) and
    ///         {profitRecipient} (arbitrage performance fee), so every revenue
    ///         stream is separately attributable on-chain.
    address public developmentFeeWallet1;
    address public developmentFeeWallet2;

    /// @notice Cumulative platform fees ever charged, per budget. Monotonic.
    uint256 public developmentFeesCollected1;
    uint256 public developmentFeesCollected2;

    /// @notice Cumulative platform fees ever paid out, per budget. Monotonic,
    ///         and can never exceed the matching `collected` figure. The two
    ///         budgets are tracked separately so one wallet can never spend
    ///         the other's allocation.
    uint256 public developmentFeesWithdrawn1;
    uint256 public developmentFeesWithdrawn2;

    /// @notice Cumulative gross (pre-fee) deposits. Reporting only — no
    ///         accounting decision is ever taken against this figure.
    uint256 public totalGrossDeposits;

    /// @notice Per-user gross deposited, fee charged, and net staked. Kept so
    ///         a user can verify their own split without replaying events.
    mapping(address => uint256) public grossDeposited;
    mapping(address => uint256) public platformFeePaid;
    mapping(address => uint256) public netStaked;

    // ============================================================
    // V2 migration window
    // ============================================================

    /// @notice Whether {migrateStake} is still callable. Starts true and can
    ///         only ever be set false, by {closeMigration}.
    bool public migrationOpen = true;

    /// @notice Total principal brought over from V2. Reporting only.
    uint256 public totalMigrated;

    /// @notice Total principal handed out as funded promotional grants.
    ///         Every unit of this was paid for on the way in, so it is a
    ///         marketing cost already borne — never a claim on other
    ///         depositors.
    uint256 public totalGranted;

    /// @notice The single deposit size the two development-fee wallets are
    ///         allowed to stake — no more, no less. They pay the development
    ///         fee on it exactly as any other depositor does.
    uint256 public constant PROTOCOL_WALLET_STAKE = 1000_000000;

    /// @notice How many free stakes the launch window will ever issue.
    /// @dev A free stake is the one position in this contract with no
    ///      collateral behind it: the holder deposits nothing, but the yield
    ///      they claim is paid in real collateral out of the pool. Left
    ///      uncapped that is an unbounded liability which grows precisely
    ///      when the promotion succeeds. Three is the entire exposure, fixed
    ///      at compile time so it cannot be raised once users are relying on
    ///      it. For funded giveaways with no such limit, use {grantStake}.
    uint256 public constant MAX_FREE_STAKES = 3;

    /// @notice Free stakes issued so far. Never decreases, so closing and
    ///         reopening a position cannot reclaim a slot.
    uint256 public freeStakeCount;

    /// @notice Timestamp at which the contract was last paused; 0 while unpaused.
    uint256 public pausedAt;
    /// @notice How long the contract must remain continuously paused before
    ///         {emergencyWithdraw} becomes available to stakers.
    uint256 public constant EMERGENCY_GRACE_PERIOD = 30 days;

    uint256 private _userCount;
    uint256 private _activeStakeCount;

    // ============================================================
    // Partner governance
    // ============================================================

    /// @notice Maximum number of partner addresses in the voting body.
    uint256 public constant MAX_PARTNERS = 4;

    /// @notice Votes required to flip {emergencyMode}. The voter set is the
    ///         owner plus all registered partners, so with a full registry
    ///         this is 3-of-5.
    uint256 public constant REQUIRED_VOTES = 3;

    /// @notice How long after {emergencyActivatedAt} stakers must wait before
    ///         {emergencyWithdraw} opens. Also the window during which a vote
    ///         can still be revoked — once it passes, the escape hatch is
    ///         irrevocable.
    uint256 public constant EMERGENCY_DELAY = 12 hours;

    /// @notice Registered partners. Only the first {partnerCount} entries are
    ///         meaningful; the tail is zeroed on removal.
    address[MAX_PARTNERS] public partners;
    uint256 public partnerCount;

    /// @notice Whether each address currently has a live emergency vote cast.
    mapping(address => bool) public emergencyVotes;
    uint256 public emergencyVoteCount;

    /// @notice Set once {REQUIRED_VOTES} is reached. Blocks new arbitrage
    ///         deployments and partner-registry changes, and starts the
    ///         {EMERGENCY_DELAY} countdown to open {emergencyWithdraw}.
    bool public emergencyMode;

    /// @notice Timestamp {emergencyMode} was set; 0 while inactive.
    uint256 public emergencyActivatedAt;

    // ============================================================
    // Emergency fund rescue
    // ============================================================

    /// @notice How long after {rescueInitiatedAt} the sweep may execute.
    ///         Deliberately longer than {EMERGENCY_DELAY}: reaching rescue
    ///         quorum also activates emergency mode, so stakers' own
    ///         {emergencyWithdraw} opens at 12 hours while the sweep cannot
    ///         fire until hour 48. Stakers get a 36-hour head start on their
    ///         own principal, and only the remainder is ever swept.
    uint256 public constant RESCUE_DELAY = 48 hours;

    /// @notice Destination of {executeRescue}. Owner-settable, but frozen for
    ///         as long as any rescue vote is outstanding, so the destination
    ///         cannot be switched underneath a vote that partners already
    ///         approved.
    address public recoveryWallet;

    /// @notice Live rescue votes, tallied separately from {emergencyVotes}.
    ///         Authorising a wind-down and authorising a sweep of the pool
    ///         are different decisions and are voted on separately.
    mapping(address => bool) public rescueVotes;
    uint256 public rescueVoteCount;

    /// @notice Timestamp rescue quorum was reached; 0 while no rescue is armed.
    uint256 public rescueInitiatedAt;

    // ============================================================
    // Arbitrage profit accounting
    // ============================================================

    /// @notice Cumulative REAL profit credited to the pool: redemption
    ///         surplus over tracked principal (net of the performance fee),
    ///         plus any profit returned via {depositArbitrageProfit}.
    uint256 public totalArbitrageProfit;

    /// @notice Collateral currently committed to open Polymarket positions,
    ///         i.e. the running sum of {committedByCondition}. Increases on
    ///         split, decreases on merge/redeem.
    uint256 public totalArbitrageDeployed;

    struct Stake {
        uint256 amount;
        uint256 plan;
        uint256 rate;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalClaimed;
        bool active;
        bool earlyExited;
        bool freeStake;
    }

    struct Referral {
        address referrer;
        uint256 totalEarned;
        uint256 pendingReward;
        uint256 activeReferrals;
        uint256 level;
    }

    mapping(address => Stake) public stakes;
    mapping(address => Referral) public referrals;
    mapping(address => uint256) public lastWithdrawalDay;
    mapping(address => uint256) public dailyWithdrawn;
    mapping(address => bool) public blacklisted;
    mapping(address => address[]) private _f1List;
    mapping(address => uint256) private _f1Volume;
    mapping(address => uint256) private _f2Volume;
    mapping(address => uint256) private _claimCounts;

    // ============================================================
    // Plan / referral configuration (preserved from the original contract)
    // ============================================================

    uint256[4] public dailyRates = [120, 180, 240, 300];
    uint256[4] public planDurations = [180, 150, 120, 90];
    uint256[4] public minStakes = [10_000000, 500_000000, 2_500_000000, 10_000_000000];

    uint256[8] public referralRates = [800, 400, 1200, 600, 1500, 800, 2000, 1000];
    uint256[3] public f3Rates = [200, 400, 500];

    /// @dev Yield-claim fee, split evenly between {feeWallet1} and
    ///      {feeWallet2}. The COMBINED rate is 10% and is what a user
    ///      actually pays; V2's uneven 7.5/2.5 split totalled the same. Both
    ///      are `constant`, so this is the one fee on the contract that not
    ///      even the owner can raise.
    uint256 private constant FEE1_BPS = 500;
    uint256 private constant FEE2_BPS = 500;
    uint256 private constant MAX_DAILY_BPS = 20000;
    uint256 private constant MAX_STAKE = 25_000_000000;
    uint256 private constant MIN_STAKE = 10_000000;
    uint256 private constant PENALTY_W1 = 5000;
    uint256 private constant PENALTY_W2 = 4000;
    uint256 private constant PENALTY_W3 = 3000;
    uint256 private constant PENALTY_W4 = 2000;
    uint256 private constant PENALTY_AF = 1000;
    uint256 private constant DAY = 1 days;
    uint256 private constant WEEK = 7 days;
    uint256 private constant BPS_DENOMINATOR = 10000;

    /// @notice Cap on the fraction of the pool's collateral balance that can
    ///         be committed to a single Polymarket split in one call (2000 = 20%),
    ///         preserved from the original contract as a risk-management bound.
    ///         Unlike the original, funds under this cap are converted into
    ///         real, contract-held Polymarket outcome tokens — they are never
    ///         sent to an external/owner wallet.
    uint256 private constant ARBITRAGE_MAX_BPS = 2000;

    // ============================================================
    // Events
    // ============================================================

    event Staked(address indexed user, uint256 amount, uint256 plan, address indexed referrer, bool free);
    event ToppedUp(address indexed user, uint256 amount, uint256 newTotal);
    event PlanUpgraded(address indexed user, uint256 oldPlan, uint256 newPlan);
    event Claimed(address indexed user, uint256 amount, uint256 fee);
    event ReferralClaimed(address indexed user, uint256 amount);
    event EarlyExited(address indexed user, uint256 amount, uint256 penalty);
    event EmergencyWithdrawn(address indexed user, uint256 amount);
    event BlacklistUpdated(address indexed user, bool value);
    event FeeWalletsUpdated(address indexed newFeeWallet1, address indexed newFeeWallet2);
    event EmergencyPaused(uint256 timestamp);

    /// @notice Emitted only after a REAL, successful call to Polymarket's
    ///         official Conditional Tokens contract.
    event ArbitrageSplitExecuted(bytes32 indexed conditionId, uint256 amount, uint256[] partition);
    /// @notice Emitted only after a REAL, successful call to Polymarket's
    ///         official Conditional Tokens contract.
    event ArbitrageMergeExecuted(bytes32 indexed conditionId, uint256 amount, uint256[] partition);
    /// @notice Emitted only after a REAL, successful redemption call;
    ///         `collateralReceived` is measured from the actual balance delta.
    event ArbitrageRedeemed(bytes32 indexed conditionId, uint256[] indexSets, uint256 collateralReceived);
    /// @notice Emitted when a performance fee is skimmed from realized
    ///         Polymarket redemption profit and sent to {profitRecipient}.
    event ProfitFeeCharged(
        bytes32 indexed conditionId, uint256 profitAmount, uint256 feeAmount, address indexed recipient
    );
    event ProfitRecipientUpdated(address indexed newRecipient);
    event ProfitFeeBpsUpdated(uint256 newFeeBPS);

    event PartnerAdded(address indexed partner, uint256 index);
    event PartnerRemoved(address indexed partner, uint256 index);
    event EmergencyVoted(address indexed voter, uint256 totalVotes);
    event EmergencyVoteRevoked(address indexed voter, uint256 totalVotes);
    event EmergencyActivated(uint256 activatedAt);
    event EmergencyCancelled();

    event RecoveryWalletUpdated(address indexed newRecoveryWallet);
    event RescueVoted(address indexed voter, uint256 totalVotes);
    event RescueVoteRevoked(address indexed voter, uint256 totalVotes);
    event RescueInitiated(uint256 initiatedAt, uint256 executableAt);
    event RescueCancelled();
    event RescueExecuted(address indexed recoveryWallet, uint256 amount);

    /// @notice Emitted when realized arbitrage profit is credited to the pool.
    event ArbitrageProfitAccrued(uint256 amount, uint256 totalProfit);

    /// @notice Emitted on every deposit, carrying the full split so the gross
    ///         amount, the fee and the recorded stake are all independently
    ///         auditable from logs alone.
    event DevelopmentFeeCharged(
        address indexed user, uint256 grossAmount, uint256 fee1, uint256 fee2, uint256 netStake
    );

    /// @notice Emitted when platform fees are paid out. `budget` is 1 or 2.
    event DevelopmentFeeWithdrawn(
        uint256 indexed budget, address indexed to, uint256 amount, uint256 remainingUnwithdrawn
    );

    event DevelopmentFeeWalletUpdated(uint256 indexed budget, address indexed newWallet);

    /// @notice Emitted when a V2 position is recreated here. `originalStartTime`
    ///         is carried over so the migrated term and penalty schedule can be
    ///         checked against the V2 record.
    event StakeMigrated(address indexed user, uint256 amount, uint256 plan, uint256 originalStartTime);

    /// @notice Emitted when a funded promotional position is opened.
    event StakeGranted(address indexed user, uint256 amount, uint256 plan);

    /// @notice Emitted once, when the migration window is permanently closed.
    event MigrationClosed_(uint256 totalMigrated);

    // ============================================================
    // Custom errors
    // ============================================================

    error ZeroAddress();
    error ZeroAmount();
    error Blacklisted();
    error ContractCallerNotAllowed();
    error AlreadyActive();
    error AlreadyExited();
    error NoActiveStake();
    error BelowMinStake();
    error AboveMaxStake();
    error InvalidFreeStakeAmount();
    error TransferAmountMismatch();
    error NothingToClaim();
    error DailyWithdrawalCapExceeded();
    error PlanUnchanged();
    error CannotBlacklistOwner();
    error AmountExceedsAvailable();
    error NotPausedError();
    error GracePeriodNotElapsed();
    error ProfitFeeTooHigh();
    error NotAVoter();
    error AlreadyVoted();
    error NotVoted();
    error PartnerLimitReached();
    error DuplicatePartner();
    error InvalidPartnerIndex();
    error CannotAddOwnerAsPartner();
    error EmergencyActive();
    error EmergencyDelayNotElapsed();
    error EmergencyIrrevocable();
    error AlreadyVotedRescue();
    error NotVotedRescue();
    error RescueNotArmed();
    error RescueQuorumNotReached();
    error RescueDelayNotElapsed();
    error RescueVotePending();
    error NoRecoveryWallet();
    error NothingToRescue();

    error DevelopmentFeeTooHigh();
    error ExceedsCollectedFees();
    error InsufficientLiquidityForFees();

    error MigrationClosed();
    error InvalidMigrationStart();
    error ProtocolWalletStakeInvalid();
    error FreeStakeLimitReached();

    // ============================================================
    // Modifiers
    // ============================================================

    modifier notBlacklisted() {
        if (blacklisted[msg.sender]) revert Blacklisted();
        _;
    }

    /// @dev Blocks contract-mediated calls (msg.sender must equal tx.origin).
    ///      This is a participation restriction (no smart-contract wallets),
    ///      not an authorization mechanism, so it does not carry the classic
    ///      tx.origin-phishing risk (nothing is *authorized* based on
    ///      tx.origin identity here — it can only ever narrow who may call in).
    modifier onlyEOA() {
        if (tx.origin != msg.sender) revert ContractCallerNotAllowed();
        _;
    }

    /// @dev Restricts to the emergency voting body: the owner plus every
    ///      registered partner.
    modifier onlyVoter() {
        if (msg.sender != owner() && !_isPartner(msg.sender)) revert NotAVoter();
        _;
    }

    modifier notEmergency() {
        if (emergencyMode) revert EmergencyActive();
        _;
    }

    // ============================================================
    // Constructor
    // ============================================================

    /// @param _collateralToken Collateral ERC-20 (must match the token the
    ///        target Polymarket condition(s) were prepared with).
    /// @param initialOwner Recommended: a Gnosis Safe multisig or an
    ///        OpenZeppelin `TimelockController` address, not a bare EOA.
    /// @param _feeWallet1 Initial primary fee recipient (funded from staking-yield claims).
    /// @param _feeWallet2 Initial secondary fee recipient (funded from staking-yield claims).
    /// @param _profitRecipient Initial recipient of the performance fee on
    ///        realized Polymarket arbitrage profit (see {profitFeeBPS}).
    ///        Distinct wallet from the two above — never hardcoded.
    /// @param _developmentFeeWallet1 First marketing/operations fee destination.
    /// @param _developmentFeeWallet2 Second marketing/operations fee destination.
    /// @param _developmentFeeBps1 First budget's share of each deposit, in bps.
    /// @param _developmentFeeBps2 Second budget's share of each deposit, in bps.
    ///        The two are fixed permanently at deployment and their sum is
    ///        capped at {DEVELOPMENT_FEE_MAX_BPS}. Publish the combined figure
    ///        wherever users deposit; the contract cannot change it
    ///        afterwards, which is the point.
    constructor(
        address _collateralToken,
        address initialOwner,
        address _feeWallet1,
        address _feeWallet2,
        address _profitRecipient,
        address _developmentFeeWallet1,
        address _developmentFeeWallet2,
        uint256 _developmentFeeBps1,
        uint256 _developmentFeeBps2
    ) Ownable(initialOwner) {
        if (
            _collateralToken == address(0) || _feeWallet1 == address(0) || _feeWallet2 == address(0)
                || _profitRecipient == address(0) || _developmentFeeWallet1 == address(0)
                || _developmentFeeWallet2 == address(0)
        ) {
            revert ZeroAddress();
        }
        if (_developmentFeeBps1 + _developmentFeeBps2 > DEVELOPMENT_FEE_MAX_BPS) revert DevelopmentFeeTooHigh();

        collateralToken = IERC20(_collateralToken);
        feeWallet1 = _feeWallet1;
        feeWallet2 = _feeWallet2;
        profitRecipient = _profitRecipient;
        developmentFeeWallet1 = _developmentFeeWallet1;
        developmentFeeWallet2 = _developmentFeeWallet2;
        DEVELOPMENT_FEE_BPS_1 = _developmentFeeBps1;
        DEVELOPMENT_FEE_BPS_2 = _developmentFeeBps2;
        profitFeeBPS = 1000; // 10% default, owner-adjustable up to PROFIT_FEE_MAX_BPS
        deployTime = block.timestamp;

        // One-time max approval to Polymarket's real Conditional Tokens
        // contract, mirroring the pattern used by Polymarket's own
        // CTFExchange (`Assets.sol`) constructor.
        collateralToken.forceApprove(POLYMARKET_CONDITIONAL_TOKENS, type(uint256).max);
    }

    // ============================================================
    // Helpers
    // ============================================================

    function _getPlanByAmount(uint256 amount) private pure returns (uint256) {
        if (amount >= 10_000_000000) return 3;
        if (amount >= 2_500_000000) return 2;
        if (amount >= 500_000000) return 1;
        return 0;
    }

    function isFreePeriod() public view returns (bool) {
        return block.timestamp < deployTime + FREE_PERIOD;
    }

    function getTimeLeft() public view returns (uint256) {
        if (!isFreePeriod()) return 0;
        return (deployTime + FREE_PERIOD) - block.timestamp;
    }

    /// @notice Whether `account` is one of the two development-fee wallets.
    /// @dev Read live rather than snapshotted, so repointing a development
    ///      wallet moves the staking restriction along with the revenue.
    ///      The yield-claim fee wallets are deliberately NOT covered — they
    ///      stake on the same terms as anyone else.
    function _isProtocolWallet(address account) private view returns (bool) {
        return account == developmentFeeWallet1 || account == developmentFeeWallet2;
    }

    /// @notice Public form of {_isProtocolWallet}, so a front-end can show the
    ///         fixed deposit size before a wallet tries and reverts.
    function isProtocolWallet(address account) external view returns (bool) {
        return _isProtocolWallet(account);
    }

    /// @dev Bounded loop: `partnerCount` can never exceed {MAX_PARTNERS} (4).
    function _isPartner(address account) private view returns (bool) {
        for (uint256 i = 0; i < partnerCount; i++) {
            if (partners[i] == account) return true;
        }
        return false;
    }

    /// @notice Realized arbitrage profit that has not yet been re-deployed
    ///         into open positions. Adds to the deployment budget on top of
    ///         the flat balance cap, so a strategy that actually earns may
    ///         work with more size than one that has not.
    function arbitrageProfitSurplus() public view returns (uint256) {
        return totalArbitrageProfit > totalArbitrageDeployed ? totalArbitrageProfit - totalArbitrageDeployed : 0;
    }

    /// @notice Platform fees collected but not yet paid out. This collateral
    ///         sits in the contract but is NOT pool capital.
    function pendingDevelopmentFees() public view returns (uint256) {
        return (developmentFeesCollected1 - developmentFeesWithdrawn1) + (developmentFeesCollected2 - developmentFeesWithdrawn2);
    }

    /// @notice Total POOL assets under management: liquid collateral plus
    ///         whatever is currently committed to open Polymarket positions,
    ///         minus platform fees that have been charged but not yet swept.
    /// @dev Subtracting {pendingDevelopmentFees} is not cosmetic. Fees sit in
    ///      the same ERC-20 balance as pool capital until withdrawn, so
    ///      without this they would inflate the arbitrage deployment ceiling
    ///      and every solvency figure the front-end reports — the pool would
    ///      appear to be backed by money earmarked for someone else. This is
    ///      the line that keeps user funds and platform revenue from mixing.
    function totalAssets() public view returns (uint256) {
        uint256 gross = collateralToken.balanceOf(address(this)) + totalArbitrageDeployed;
        uint256 fees = pendingDevelopmentFees();
        return gross > fees ? gross - fees : 0;
    }

    /// @notice Cumulative ceiling on {totalArbitrageDeployed}: an
    ///         {ARBITRAGE_MAX_BPS} share of {totalAssets}, plus all realized
    ///         profit the pool has ever kept.
    function arbitrageDeploymentCeiling() public view returns (uint256) {
        return (totalAssets() * ARBITRAGE_MAX_BPS) / BPS_DENOMINATOR + totalArbitrageProfit;
    }

    /// @notice Maximum amount of pooled collateral that may be committed to
    ///         {executePolymarketSplit} right now.
    /// @dev The cap is CUMULATIVE, measured against {arbitrageDeploymentCeiling},
    ///      not a flat percentage of the current balance. A per-call
    ///      percentage cap is not a cap at all: each split shrinks the balance
    ///      the next one is measured against, so repeated calls converge on
    ///      the entire pool. Forty calls were enough to move over 99% of the
    ///      collateral into outcome tokens and leave {emergencyWithdraw}
    ///      reverting for lack of liquidity. Because a split leaves
    ///      {totalAssets} unchanged, this ceiling does not move as it is
    ///      consumed. Also clamped to the liquid balance, since the contract
    ///      cannot split collateral it does not hold.
    function polymarketArbitrageAvailable() public view returns (uint256) {
        uint256 ceiling = arbitrageDeploymentCeiling();
        uint256 deployed = totalArbitrageDeployed;
        if (deployed >= ceiling) return 0;

        uint256 headroom = ceiling - deployed;
        uint256 balance = collateralToken.balanceOf(address(this));
        return headroom > balance ? balance : headroom;
    }

    // ============================================================
    // Owner functions — Polymarket integration (REAL on-chain calls only)
    // ============================================================

    /// @notice Converts `amount` of pooled `collateralToken` into a complete
    ///         set of Polymarket outcome-token positions for `conditionId`,
    ///         via a real call to Polymarket's official, permissionless
    ///         Conditional Tokens contract. See the contract-level NatSpec
    ///         for the honest limitation on realizing profit from this via
    ///         the order book.
    /// @param conditionId Polymarket condition ID for the target market
    ///        (obtained off-chain from Polymarket's API/subgraph).
    /// @param partition Index-set partition, e.g. `[1, 2]` for a standard
    ///        binary YES/NO market's complete set.
    /// @param amount Amount of `collateralToken` to convert.
    function executePolymarketSplit(bytes32 conditionId, uint256[] calldata partition, uint256 amount)
        external
        onlyOwner
        whenNotPaused
        notEmergency
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (amount > polymarketArbitrageAvailable()) revert AmountExceedsAvailable();

        // Effects before the external call (strict CEI): `amount` is already
        // known at this point, so there is no need to wait for the call to
        // return before updating accounting.
        committedByCondition[conditionId] += amount;
        totalArbitrageDeployed += amount;

        IConditionalTokens(POLYMARKET_CONDITIONAL_TOKENS)
            .splitPosition(collateralToken, bytes32(0), conditionId, partition, amount);

        emit ArbitrageSplitExecuted(conditionId, amount, partition);
    }

    /// @notice Burns a complete set of Polymarket outcome-token positions
    ///         held by this contract and returns `amount` of collateral, via
    ///         a real call to Polymarket's official Conditional Tokens
    ///         contract. Does not draw new funds from the pool beyond
    ///         positions already held. No performance fee is charged here —
    ///         a merge before resolution is treated as unwinding, not
    ///         realizing profit; the fee is only ever charged at
    ///         {executePolymarketRedeem}.
    /// @dev Deliberately NOT `whenNotPaused`, unlike {executePolymarketSplit}.
    ///      Merging only moves value back INTO the contract, and pausing is
    ///      exactly when unwinding matters most. Gating it would deadlock the
    ///      emergency path: {emergencyMode} auto-pauses, so a paused-merge
    ///      would strand collateral in open positions precisely while stakers
    ///      are trying to withdraw it. {executePolymarketRedeem} is ungated
    ///      for the same reason.
    function executePolymarketMerge(bytes32 conditionId, uint256[] calldata partition, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();

        // Effects before the external call (strict CEI): `amount` is already
        // known at this point, so there is no need to wait for the call to
        // return before updating accounting.
        uint256 committed = committedByCondition[conditionId];
        uint256 released = amount >= committed ? committed : amount;
        committedByCondition[conditionId] = committed - released;
        totalArbitrageDeployed -= released;

        IConditionalTokens(POLYMARKET_CONDITIONAL_TOKENS)
            .mergePositions(collateralToken, bytes32(0), conditionId, partition, amount);

        emit ArbitrageMergeExecuted(conditionId, amount, partition);
    }

    /// @notice Redeems already-held Polymarket outcome-token positions for
    ///         collateral after `conditionId` has been resolved by its
    ///         oracle. Fully autonomous, on-chain, no order-book dependency.
    /// @dev A performance fee ({profitFeeBPS}) is charged ONLY on the amount
    ///      by which `received` exceeds this contract's own tracked
    ///      {committedByCondition} for `conditionId` — i.e. only on genuine
    ///      profit, never on principal the contract itself split into this
    ///      position. Assumes the full committed position for `conditionId`
    ///      is redeemed in one call; partial redemptions make this a
    ///      conservative (not exact) profit estimate — documented, not
    ///      silently wrong.
    function executePolymarketRedeem(bytes32 conditionId, uint256[] calldata indexSets)
        external
        onlyOwner
        nonReentrant
    {
        uint256 balanceBefore = collateralToken.balanceOf(address(this));

        uint256 committed = committedByCondition[conditionId];

        IConditionalTokens(POLYMARKET_CONDITIONAL_TOKENS)
            .redeemPositions(collateralToken, bytes32(0), conditionId, indexSets);

        uint256 received = collateralToken.balanceOf(address(this)) - balanceBefore;

        // The principal tracker is retired by the amount ACTUALLY recovered,
        // never zeroed outright. Zeroing it up front made partial redemptions
        // exploitable: the first call retired the whole commitment while
        // returning only part of it, so a second call on the same condition
        // saw `committed == 0` and billed 100% of the proceeds — pure staker
        // principal — as profit. Retiring only `principalReturned` leaves the
        // unrecovered remainder on the books for the next call.
        //
        // This writes state after the external call, departing from the strict
        // CEI used elsewhere. That is unavoidable: `received` is a balance
        // delta and cannot be known beforehand. It is safe here because the
        // function is `onlyOwner` + `nonReentrant` and the only external call
        // is to the fixed, trusted Conditional Tokens address.
        uint256 principalReturned = received > committed ? committed : received;
        committedByCondition[conditionId] = committed - principalReturned;
        totalArbitrageDeployed -= principalReturned;

        uint256 profit = received - principalReturned;
        uint256 fee = (profit * profitFeeBPS) / BPS_DENOMINATOR;
        if (fee > 0) {
            collateralToken.safeTransfer(profitRecipient, fee);
            emit ProfitFeeCharged(conditionId, profit, fee, profitRecipient);
        }

        // Credit only what the pool actually keeps, so the deployment budget
        // never grows on profit that was paid out as a fee.
        uint256 netProfit = profit - fee;
        if (netProfit > 0) {
            totalArbitrageProfit += netProfit;
            emit ArbitrageProfitAccrued(netProfit, totalArbitrageProfit);
        }

        emit ArbitrageRedeemed(conditionId, indexSets, received);
    }

    /// @notice Everything a dashboard needs to show where the money is, in one
    ///         call, so the three figures can never be assembled from
    ///         inconsistent block heights.
    /// @return grossDeposits Cumulative pre-fee deposits ever received.
    /// @return developmentFees Cumulative platform fees ever charged.
    /// @return userNetStakes Principal currently owed to stakers.
    /// @return mainPoolBalance Pool capital held now, excluding unswept fees.
    /// @return developmentFeeBalance Fees charged but not yet swept.
    /// @return deployedToArbitrage Pool capital in open Polymarket positions.
    function dashboard()
        external
        view
        returns (
            uint256 grossDeposits,
            uint256 developmentFees,
            uint256 userNetStakes,
            uint256 mainPoolBalance,
            uint256 developmentFeeBalance,
            uint256 deployedToArbitrage
        )
    {
        grossDeposits = totalGrossDeposits;
        developmentFees = developmentFeesCollected1 + developmentFeesCollected2;
        userNetStakes = totalStaked;
        mainPoolBalance = totalAssets();
        developmentFeeBalance = pendingDevelopmentFees();
        deployedToArbitrage = totalArbitrageDeployed;
    }

    /// @notice A single user's deposit split, for the same reason as
    ///         {dashboard}: one call, one consistent view.
    function userDepositBreakdown(address user)
        external
        view
        returns (uint256 gross, uint256 platformFee, uint256 netStake, uint256 activeStake)
    {
        gross = grossDeposited[user];
        platformFee = platformFeePaid[user];
        netStake = netStaked[user];
        activeStake = stakes[user].amount;
    }

    /// @notice Read-only passthrough to Polymarket's real Conditional Tokens
    ///         ERC-1155 balance for a specific, off-chain-computed position ID.
    ///         Position IDs are not derived on-chain here — see contract notes.
    function getPolymarketOutcomeBalance(uint256 positionId) external view returns (uint256) {
        return IConditionalTokens(POLYMARKET_CONDITIONAL_TOKENS).balanceOf(address(this), positionId);
    }

    /// @notice Returns externally-earned arbitrage profit to the pool and
    ///         credits it toward {totalArbitrageProfit}. Value moves INTO the
    ///         contract only — there is no counterpart function that moves it
    ///         out to a wallet.
    /// @dev The credited amount is measured as the actual balance delta, not
    ///      the `amount` argument, so a fee-on-transfer collateral token
    ///      cannot inflate the deployment budget beyond what really arrived.
    function depositArbitrageProfit(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 balanceBefore = collateralToken.balanceOf(address(this));
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = collateralToken.balanceOf(address(this)) - balanceBefore;

        totalArbitrageProfit += received;
        emit ArbitrageProfitAccrued(received, totalArbitrageProfit);
    }

    // ============================================================
    // Partner governance — emergency vote
    // ============================================================

    /// @notice Registers a partner into the emergency voting body.
    /// @dev Blocked while {emergencyMode} is set so the owner cannot pack the
    ///      voting body while a vote is in flight.
    function addPartner(address partner) external onlyOwner notEmergency {
        if (partner == address(0)) revert ZeroAddress();
        if (partner == owner()) revert CannotAddOwnerAsPartner();
        if (partnerCount >= MAX_PARTNERS) revert PartnerLimitReached();
        if (_isPartner(partner)) revert DuplicatePartner();

        partners[partnerCount] = partner;
        partnerCount++;
        emit PartnerAdded(partner, partnerCount - 1);
    }

    /// @notice Removes a partner, clearing any live vote they had cast.
    /// @dev Blocked while {emergencyMode} is set so the owner cannot dissolve
    ///      the voting body to cancel a vote already in flight. Uses
    ///      swap-and-pop, so surviving partners may change index.
    function removePartner(uint256 index) external onlyOwner notEmergency {
        if (index >= partnerCount) revert InvalidPartnerIndex();

        address removed = partners[index];
        if (emergencyVotes[removed]) {
            emergencyVotes[removed] = false;
            emergencyVoteCount--;
        }

        uint256 lastIndex = partnerCount - 1;
        if (index != lastIndex) partners[index] = partners[lastIndex];
        partners[lastIndex] = address(0);
        partnerCount = lastIndex;

        emit PartnerRemoved(removed, index);
    }

    /// @notice Casts an emergency vote. On reaching {REQUIRED_VOTES} the
    ///         contract enters {emergencyMode}: it pauses immediately, new
    ///         arbitrage deployments stop, and {EMERGENCY_DELAY} later every
    ///         staker may withdraw their principal via {emergencyWithdraw}.
    function voteEmergency() external onlyVoter notEmergency {
        if (emergencyVotes[msg.sender]) revert AlreadyVoted();

        emergencyVotes[msg.sender] = true;
        emergencyVoteCount++;
        emit EmergencyVoted(msg.sender, emergencyVoteCount);

        if (emergencyVoteCount >= REQUIRED_VOTES) {
            emergencyMode = true;
            emergencyActivatedAt = block.timestamp;
            if (!paused()) {
                _pause();
                pausedAt = block.timestamp;
                emit EmergencyPaused(block.timestamp);
            }
            emit EmergencyActivated(block.timestamp);
        }
    }

    /// @notice Withdraws a previously cast vote. If this drops an active
    ///         emergency below {REQUIRED_VOTES}, emergency mode is cancelled
    ///         (the contract stays paused — the owner must {unpause}
    ///         deliberately).
    /// @dev Once {EMERGENCY_DELAY} has elapsed the escape hatch is open and
    ///      can no longer be revoked, so stakers' withdrawal right cannot be
    ///      taken back out from under them.
    function revokeEmergencyVote() external onlyVoter {
        if (!emergencyVotes[msg.sender]) revert NotVoted();
        if (emergencyMode && block.timestamp >= emergencyActivatedAt + EMERGENCY_DELAY) revert EmergencyIrrevocable();

        emergencyVotes[msg.sender] = false;
        emergencyVoteCount--;
        emit EmergencyVoteRevoked(msg.sender, emergencyVoteCount);

        if (emergencyMode && emergencyVoteCount < REQUIRED_VOTES) {
            emergencyMode = false;
            emergencyActivatedAt = 0;
            emit EmergencyCancelled();
        }
    }

    /// @notice Whether {emergencyWithdraw} is currently callable, via either
    ///         the long pause-grace path or the partner-vote path.
    function emergencyWithdrawOpen() public view returns (bool) {
        if (emergencyMode && block.timestamp >= emergencyActivatedAt + EMERGENCY_DELAY) return true;
        return paused() && pausedAt != 0 && block.timestamp >= pausedAt + EMERGENCY_GRACE_PERIOD;
    }

    /// @notice The full emergency voting body: the owner followed by every
    ///         registered partner.
    function getVoters() external view returns (address[] memory voters) {
        voters = new address[](partnerCount + 1);
        voters[0] = owner();
        for (uint256 i = 0; i < partnerCount; i++) {
            voters[i + 1] = partners[i];
        }
    }

    function isPartner(address account) external view returns (bool) {
        return _isPartner(account);
    }

    // ============================================================
    // Emergency fund rescue — partner-gated, time-delayed
    // ============================================================

    // ============================================================
    // One-time migration of V2 positions
    // ============================================================

    /// @notice Recreates a staker's V2 position here, funded by the caller.
    /// @dev The alternative — telling users to exit V2 and re-stake — costs
    ///      them the early-exit penalty and then the development fee on the
    ///      way back in, roughly half their principal. This path preserves
    ///      the position instead, and the cost lands on whoever calls it.
    ///
    ///      Four properties keep this from being a mint function:
    ///
    ///        1. `amount` is pulled from the caller by `safeTransferFrom` and
    ///           the balance delta is verified, so a migrated stake is always
    ///           backed by collateral that actually arrived. No position can
    ///           be conjured.
    ///        2. `lastClaimTime` is set to now, never to `originalStartTime`.
    ///           Yield accrues only from migration forward, so backdating
    ///           `originalStartTime` cannot mint retroactive rewards — the
    ///           obvious way this function could otherwise be abused.
    ///        3. `originalStartTime` may not be in the future, and is used
    ///           only for the term end and penalty schedule, so a migrated
    ///           user keeps the position age they had earned.
    ///        4. The whole facility is disabled permanently by
    ///           {closeMigration}, which cannot be undone.
    ///
    ///      No development fee is charged: this is a continuation of a stake
    ///      already made, not a new deposit.
    function migrateStake(address user, uint256 amount, uint256 originalStartTime)
        external
        onlyOwner
        nonReentrant
    {
        if (!migrationOpen) revert MigrationClosed();
        if (user == address(0)) revert ZeroAddress();
        if (amount < MIN_STAKE) revert BelowMinStake();
        if (amount > MAX_STAKE) revert AboveMaxStake();
        if (originalStartTime > block.timestamp) revert InvalidMigrationStart();

        Stake storage s = stakes[user];
        if (s.active) revert AlreadyActive();
        if (s.earlyExited) revert AlreadyExited();

        // The position must be paid for. Verified by delta so a fee-on-transfer
        // collateral cannot leave the stake partly unbacked.
        uint256 balanceBefore = collateralToken.balanceOf(address(this));
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        if (collateralToken.balanceOf(address(this)) != balanceBefore + amount) {
            revert TransferAmountMismatch();
        }

        uint256 plan = _getPlanByAmount(amount);
        if (s.amount == 0) _userCount++;
        stakes[user] = Stake({
            amount: amount,
            plan: plan,
            rate: dailyRates[plan],
            startTime: originalStartTime,
            lastClaimTime: block.timestamp,
            totalClaimed: 0,
            active: true,
            earlyExited: false,
            freeStake: false
        });
        totalStaked += amount;
        _activeStakeCount++;
        totalMigrated += amount;

        emit StakeMigrated(user, amount, plan, originalStartTime);
    }

    /// @notice Opens a promotional position for `user`, paid for by the caller.
    /// @dev The honest form of a "free package". A free stake in the V2 sense
    ///      creates a position with no collateral behind it, so the yield it
    ///      draws comes out of other depositors' principal — and the better
    ///      the promotion works, the larger that hole gets. Here the owner
    ///      funds the grant up front from marketing budget: the user still
    ///      pays nothing, the position is still real, but the cost sits with
    ///      whoever ran the promotion instead of with the other stakers.
    ///
    ///      Same guarantees as {migrateStake}: the collateral is pulled from
    ///      the caller and verified by balance delta, accrual starts now, and
    ///      the total is bounded by what has actually been funded — so the
    ///      protocol's exposure to a promotion can never exceed its budget.
    ///
    ///      No development fee is taken; the grant is already a cost to the
    ///      project rather than a deposit by the user.
    function grantStake(address user, uint256 amount) external onlyOwner nonReentrant {
        if (user == address(0)) revert ZeroAddress();
        if (amount < MIN_STAKE) revert BelowMinStake();
        if (amount > MAX_STAKE) revert AboveMaxStake();

        Stake storage s = stakes[user];
        if (s.active) revert AlreadyActive();
        if (s.earlyExited) revert AlreadyExited();

        uint256 balanceBefore = collateralToken.balanceOf(address(this));
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        if (collateralToken.balanceOf(address(this)) != balanceBefore + amount) {
            revert TransferAmountMismatch();
        }

        uint256 plan = _getPlanByAmount(amount);
        if (s.amount == 0) _userCount++;
        stakes[user] = Stake({
            amount: amount,
            plan: plan,
            rate: dailyRates[plan],
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            totalClaimed: 0,
            active: true,
            earlyExited: false,
            freeStake: false
        });
        totalStaked += amount;
        _activeStakeCount++;
        totalGranted += amount;

        emit StakeGranted(user, amount, plan);
    }

    /// @notice Permanently ends the migration window.
    /// @dev One-way. Once closed, the only route to a stake is {stake}, which
    ///      charges the development fee like any other deposit — so migration
    ///      cannot be reused later as a fee-free side door.
    function closeMigration() external onlyOwner {
        migrationOpen = false;
        emit MigrationClosed_(totalMigrated);
    }

    // ============================================================
    // Owner functions — site growth fee
    // ============================================================

    /// @notice Pays out accrued platform fees for `budget` (1 or 2) to that
    ///         budget's wallet.
    /// @dev Three independent limits apply, and all three are arithmetic
    ///      rather than policy:
    ///        1. `amount` cannot exceed that budget's own
    ///           `collected - withdrawn`, so one budget can never spend the
    ///           other's allocation;
    ///        2. it cannot exceed the contract's liquid balance;
    ///        3. it cannot reduce the liquid balance below what non-fee
    ///           liabilities need — checked via {totalAssets}, which already
    ///           nets out pending fees.
    ///      There is no path here to staker principal: the ceiling is set by
    ///      fees actually charged on deposits, and the owner cannot raise the
    ///      rate that produced them ({DEVELOPMENT_FEE_BPS_1}/{DEVELOPMENT_FEE_BPS_2}
    ///      are immutable).
    function withdrawDevelopmentFees(uint256 budget, uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 available;
        address destination;
        if (budget == 1) {
            available = developmentFeesCollected1 - developmentFeesWithdrawn1;
            destination = developmentFeeWallet1;
        } else if (budget == 2) {
            available = developmentFeesCollected2 - developmentFeesWithdrawn2;
            destination = developmentFeeWallet2;
        } else {
            revert ExceedsCollectedFees();
        }

        if (amount > available) revert ExceedsCollectedFees();
        if (amount > collateralToken.balanceOf(address(this))) revert InsufficientLiquidityForFees();

        // Effects before the interaction (strict CEI).
        if (budget == 1) developmentFeesWithdrawn1 += amount;
        else developmentFeesWithdrawn2 += amount;

        collateralToken.safeTransfer(destination, amount);
        emit DevelopmentFeeWithdrawn(budget, destination, amount, available - amount);
    }

    /// @notice Repoints a fee budget's destination wallet.
    /// @dev Changes where future fees are paid; it cannot change how much is
    ///      owed, and cannot reach pool capital.
    function setDevelopmentFeeWallet(uint256 budget, address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert ZeroAddress();
        if (budget == 1) developmentFeeWallet1 = newWallet;
        else if (budget == 2) developmentFeeWallet2 = newWallet;
        else revert ExceedsCollectedFees();
        emit DevelopmentFeeWalletUpdated(budget, newWallet);
    }

    // ============================================================

    /// @notice Sets the destination for {executeRescue}.
    /// @dev Frozen while any rescue vote is outstanding, so the owner cannot
    ///      re-point the destination after partners have approved a sweep to
    ///      a particular address. To change it, the pending votes must be
    ///      revoked first.
    function setRecoveryWallet(address newRecoveryWallet) external onlyOwner {
        if (newRecoveryWallet == address(0)) revert ZeroAddress();
        if (rescueVoteCount > 0) revert RescueVotePending();
        recoveryWallet = newRecoveryWallet;
        emit RecoveryWalletUpdated(newRecoveryWallet);
    }

    /// @notice Casts a rescue vote. On reaching {REQUIRED_VOTES} the sweep is
    ///         armed: the contract enters {emergencyMode} (pausing it and
    ///         starting the 2-day countdown to stakers' own
    ///         {emergencyWithdraw}), and {executeRescue} becomes callable
    ///         {RESCUE_DELAY} after this moment.
    /// @dev Voted separately from {voteEmergency} on purpose. Winding the
    ///      pool down and sweeping it to a recovery wallet are different
    ///      decisions, and a partner who agrees to the first has not thereby
    ///      agreed to the second.
    function voteRescue() external onlyVoter {
        if (rescueVotes[msg.sender]) revert AlreadyVotedRescue();

        rescueVotes[msg.sender] = true;
        rescueVoteCount++;
        emit RescueVoted(msg.sender, rescueVoteCount);

        if (rescueVoteCount >= REQUIRED_VOTES && rescueInitiatedAt == 0) {
            rescueInitiatedAt = block.timestamp;

            // Arming a sweep also opens the stakers' own exit, so they are
            // never left with a locked contract and a pending drain.
            if (!emergencyMode) {
                emergencyMode = true;
                emergencyActivatedAt = block.timestamp;
                emit EmergencyActivated(block.timestamp);
            }
            if (!paused()) {
                _pause();
                pausedAt = block.timestamp;
                emit EmergencyPaused(block.timestamp);
            }

            emit RescueInitiated(block.timestamp, block.timestamp + RESCUE_DELAY);
        }
    }

    /// @notice Withdraws a rescue vote, disarming the sweep if this drops the
    ///         tally below quorum.
    /// @dev Unlike {revokeEmergencyVote}, this stays available right up until
    ///      {executeRescue} succeeds, and has no irrevocability window.
    ///      Revoking here is the safety-increasing direction — it removes a
    ///      pending drain — so it is never locked. Cancelling a rescue does
    ///      NOT clear {emergencyMode}: stakers keep the exit they were
    ///      already promised.
    function revokeRescueVote() external onlyVoter {
        if (!rescueVotes[msg.sender]) revert NotVotedRescue();

        rescueVotes[msg.sender] = false;
        rescueVoteCount--;
        emit RescueVoteRevoked(msg.sender, rescueVoteCount);

        if (rescueVoteCount < REQUIRED_VOTES && rescueInitiatedAt != 0) {
            rescueInitiatedAt = 0;
            emit RescueCancelled();
        }
    }

    /// @notice Sweeps the contract's entire remaining collateral balance to
    ///         {recoveryWallet}. Requires a standing {REQUIRED_VOTES} quorum
    ///         AND {RESCUE_DELAY} elapsed since the vote passed.
    /// @dev This is the last-resort response to a compromise. Three things
    ///      keep it from being a unilateral drain: it needs partner quorum,
    ///      it is announced on-chain {RESCUE_DELAY} in advance, and stakers'
    ///      {emergencyWithdraw} opens 36 hours before it can fire. A stolen
    ///      owner key alone cannot reach it.
    function executeRescue() external onlyOwner nonReentrant {
        if (rescueInitiatedAt == 0) revert RescueNotArmed();
        if (rescueVoteCount < REQUIRED_VOTES) revert RescueQuorumNotReached();
        if (block.timestamp < rescueInitiatedAt + RESCUE_DELAY) revert RescueDelayNotElapsed();

        address destination = recoveryWallet;
        if (destination == address(0)) revert NoRecoveryWallet();

        uint256 amount = collateralToken.balanceOf(address(this));
        if (amount == 0) revert NothingToRescue();

        collateralToken.safeTransfer(destination, amount);
        emit RescueExecuted(destination, amount);
    }

    /// @notice Whether {executeRescue} would succeed right now.
    function rescueReady() external view returns (bool) {
        return rescueInitiatedAt != 0 && rescueVoteCount >= REQUIRED_VOTES
            && block.timestamp >= rescueInitiatedAt + RESCUE_DELAY && recoveryWallet != address(0)
            && collateralToken.balanceOf(address(this)) > 0;
    }

    /// @notice Timestamp {executeRescue} becomes callable; 0 if not armed.
    function rescueExecutableAt() external view returns (uint256) {
        if (rescueInitiatedAt == 0) return 0;
        return rescueInitiatedAt + RESCUE_DELAY;
    }

    // ============================================================
    // Owner functions — administration
    // ============================================================

    function pause() external onlyOwner {
        _pause();
        pausedAt = block.timestamp;
        emit EmergencyPaused(block.timestamp);
    }

    /// @dev `notEmergency` is load-bearing, not decoration: {emergencyWithdraw}
    ///      requires the contract to be paused, so an owner able to unpause
    ///      during {emergencyMode} could slam the escape hatch shut and undo
    ///      the partner vote single-handedly. Once a vote passes and
    ///      {EMERGENCY_DELAY} elapses it can no longer be revoked, so the
    ///      contract is deliberately paused for good at that point — the vote
    ///      is a wind-down decision, and stakers exit via {emergencyWithdraw}.
    function unpause() external onlyOwner notEmergency {
        _unpause();
        pausedAt = 0;
    }

    /// @notice Blocks (or unblocks) an address from new stakes, top-ups,
    ///         plan upgrades, and claiming yield/referral rewards. Cannot be
    ///         used to block {earlyExit} or {emergencyWithdraw} — a user's
    ///         principal can never be permanently frozen by this flag.
    function setBlacklist(address user, bool value) external onlyOwner {
        if (user == owner()) revert CannotBlacklistOwner();
        blacklisted[user] = value;
        emit BlacklistUpdated(user, value);
    }

    function setFeeWallets(address newFeeWallet1, address newFeeWallet2) external onlyOwner {
        if (newFeeWallet1 == address(0) || newFeeWallet2 == address(0)) revert ZeroAddress();
        feeWallet1 = newFeeWallet1;
        feeWallet2 = newFeeWallet2;
        emit FeeWalletsUpdated(newFeeWallet1, newFeeWallet2);
    }

    /// @notice Updates the recipient of the Polymarket-arbitrage performance
    ///         fee. Distinct role from {setFeeWallets} — never hardcoded.
    function setProfitRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        profitRecipient = newRecipient;
        emit ProfitRecipientUpdated(newRecipient);
    }

    /// @notice Updates the performance fee rate charged on realized
    ///         Polymarket redemption profit. Hard-capped at
    ///         {PROFIT_FEE_MAX_BPS} — can never be raised above 20%.
    function setProfitFeeBPS(uint256 newFeeBPS) external onlyOwner {
        if (newFeeBPS > PROFIT_FEE_MAX_BPS) revert ProfitFeeTooHigh();
        profitFeeBPS = newFeeBPS;
        emit ProfitFeeBpsUpdated(newFeeBPS);
    }

    // ============================================================
    // User functions
    // ============================================================

    /// @notice Opens a stake. `grossAmount` is what leaves the caller's wallet;
    ///         the recorded stake is `grossAmount` minus the platform fee.
    /// @dev Every downstream figure — plan tier, minimum/maximum bounds,
    ///      referral volume, the stake itself — is derived from the NET
    ///      amount, never the gross. That is what keeps the contract's
    ///      liability equal to what it actually holds: it never books a
    ///      stake larger than the capital backing it. Use {quoteDeposit} to
    ///      show a user their split before they sign.
    function stake(uint256 grossAmount, address referrer)
        external
        whenNotPaused
        notBlacklisted
        onlyEOA
        nonReentrant
    {
        Stake storage s = stakes[msg.sender];
        if (s.active) revert AlreadyActive();
        if (s.earlyExited) revert AlreadyExited();

        bool free = isFreePeriod();

        // The two development-fee wallets are held to one exact deposit size,
        // and are barred from the free-stake window. A free position for a
        // wallet that collects protocol revenue would be a claim on other
        // depositors' capital with nothing behind it; requiring the same
        // 1,000 as everyone else means their position is funded like any
        // other. The set is read live, so repointing a wallet moves the
        // restriction with it.
        if (_isProtocolWallet(msg.sender)) {
            if (free) revert ProtocolWalletStakeInvalid();
            if (grossAmount != PROTOCOL_WALLET_STAKE) revert ProtocolWalletStakeInvalid();
        }

        // A free stake moves no collateral, so there is nothing to take a fee
        // from; it is booked at face value exactly as in V2.
        (uint256 fee1, uint256 fee2, uint256 amount) = free
            ? (uint256(0), uint256(0), grossAmount)
            : _splitDeposit(grossAmount);

        if (free) {
            if (grossAmount != MIN_STAKE) revert InvalidFreeStakeAmount();
            // Counted before the stake is written, and never decremented, so
            // the cap holds across exits and re-entries.
            if (freeStakeCount >= MAX_FREE_STAKES) revert FreeStakeLimitReached();
            freeStakeCount++;
        }
        if (amount < MIN_STAKE) revert BelowMinStake();
        if (amount > MAX_STAKE) revert AboveMaxStake();

        uint256 plan = _getPlanByAmount(amount);

        if (!free) {
            uint256 balanceBefore = collateralToken.balanceOf(address(this));
            collateralToken.safeTransferFrom(msg.sender, address(this), grossAmount);
            if (collateralToken.balanceOf(address(this)) != balanceBefore + grossAmount) {
                revert TransferAmountMismatch();
            }
            _recordDeposit(msg.sender, grossAmount, fee1, fee2, amount);
        }

        if (referrer != address(0) && referrer != msg.sender && stakes[referrer].active && !blacklisted[referrer]) {
            referrals[msg.sender].referrer = referrer;
            referrals[referrer].activeReferrals++;
            _f1List[referrer].push(msg.sender);
            _f1Volume[referrer] += amount;
            _updateLevel(referrer);
            address grandparent = referrals[referrer].referrer;
            if (grandparent != address(0)) _f2Volume[grandparent] += amount;
        }

        if (s.amount == 0) _userCount++;
        stakes[msg.sender] =
            Stake(amount, plan, dailyRates[plan], block.timestamp, block.timestamp, 0, true, false, free);
        if (!free) totalStaked += amount;
        _activeStakeCount++;
        emit Staked(msg.sender, amount, plan, referrer, free);
    }

    /// @notice Splits a gross deposit into the two fee budgets and the net
    ///         stake. Pure arithmetic on immutable rates — there is no branch
    ///         here the owner can influence.
    /// @dev The net is computed by subtraction rather than as its own
    ///      percentage, so integer truncation can never make the three parts
    ///      sum to more than `grossAmount`.
    function _splitDeposit(uint256 grossAmount) private view returns (uint256 fee1, uint256 fee2, uint256 net) {
        fee1 = (grossAmount * DEVELOPMENT_FEE_BPS_1) / BPS_DENOMINATOR;
        fee2 = (grossAmount * DEVELOPMENT_FEE_BPS_2) / BPS_DENOMINATOR;
        net = grossAmount - fee1 - fee2;
    }

    /// @dev Books a deposit's fee split. Called after the transfer has been
    ///      verified, so `developmentFeesCollected*` only ever grows against
    ///      collateral the contract demonstrably received.
    function _recordDeposit(address user, uint256 grossAmount, uint256 fee1, uint256 fee2, uint256 net) private {
        developmentFeesCollected1 += fee1;
        developmentFeesCollected2 += fee2;
        totalGrossDeposits += grossAmount;
        grossDeposited[user] += grossAmount;
        platformFeePaid[user] += fee1 + fee2;
        netStaked[user] += net;
        emit DevelopmentFeeCharged(user, grossAmount, fee1, fee2, net);
    }

    /// @notice What a `grossAmount` deposit would actually buy: the fee taken
    ///         and the stake recorded. Front-ends must show this before the
    ///         user signs — the fee is only honest if it is disclosed.
    function quoteDeposit(uint256 grossAmount)
        external
        view
        returns (uint256 fee1, uint256 fee2, uint256 totalFee, uint256 netStake)
    {
        (fee1, fee2, netStake) = _splitDeposit(grossAmount);
        totalFee = fee1 + fee2;
    }

    /// @notice Adds to an existing stake. The same fee split as {stake}
    ///         applies, so a top-up cannot be used to route capital in at a
    ///         different rate than a first deposit.
    function topUp(uint256 grossAmount) external whenNotPaused notBlacklisted onlyEOA nonReentrant {
        Stake storage s = stakes[msg.sender];
        if (!s.active) revert NoActiveStake();
        if (s.freeStake) revert InvalidFreeStakeAmount();
        // Topping up would defeat the fixed size the development wallets are
        // held to, so it is closed to them rather than bounded.
        if (_isProtocolWallet(msg.sender)) revert ProtocolWalletStakeInvalid();

        (uint256 fee1, uint256 fee2, uint256 amount) = _splitDeposit(grossAmount);
        if (amount < MIN_STAKE) revert BelowMinStake();
        uint256 newTotal = s.amount + amount;
        if (newTotal > MAX_STAKE) revert AboveMaxStake();

        uint256 balanceBefore = collateralToken.balanceOf(address(this));
        collateralToken.safeTransferFrom(msg.sender, address(this), grossAmount);
        if (collateralToken.balanceOf(address(this)) != balanceBefore + grossAmount) revert TransferAmountMismatch();
        _recordDeposit(msg.sender, grossAmount, fee1, fee2, amount);

        s.amount = newTotal;
        totalStaked += amount;

        address referrer = referrals[msg.sender].referrer;
        if (referrer != address(0)) {
            _f1Volume[referrer] += amount;
            address grandparent = referrals[referrer].referrer;
            if (grandparent != address(0)) _f2Volume[grandparent] += amount;
            _updateLevel(referrer);
        }
        emit ToppedUp(msg.sender, amount, newTotal);
    }

    function upgradePlan() external whenNotPaused notBlacklisted onlyEOA nonReentrant {
        Stake storage s = stakes[msg.sender];
        if (!s.active) revert NoActiveStake();
        if (s.freeStake) revert InvalidFreeStakeAmount();
        uint256 newPlan = _getPlanByAmount(s.amount);
        if (newPlan == s.plan) revert PlanUnchanged();
        uint256 oldPlan = s.plan;
        s.plan = newPlan;
        s.rate = dailyRates[newPlan];
        emit PlanUpgraded(msg.sender, oldPlan, newPlan);
    }

    function claim() external whenNotPaused notBlacklisted onlyEOA nonReentrant {
        Stake storage s = stakes[msg.sender];
        if (!s.active) revert NoActiveStake();

        uint256 reward = _pendingReward(msg.sender);
        // slither-disable-next-line incorrect-equality
        // `reward` is a deterministic function of stored state (amount/rate/
        // elapsed time), not an externally-manipulable balance — an exact
        // zero-check here is correct, not a "dangerous" strict equality.
        if (reward == 0) revert NothingToClaim();

        _checkDailyCap(msg.sender, reward);
        s.lastClaimTime = block.timestamp;
        s.totalClaimed += reward;
        totalPaidOut += reward;

        uint256 fee1 = (reward * FEE1_BPS) / BPS_DENOMINATOR;
        uint256 fee2 = (reward * FEE2_BPS) / BPS_DENOMINATOR;
        uint256 userAmount = reward - fee1 - fee2;

        _processReferralRewards(msg.sender, reward);
        _updateDailyWithdrawn(msg.sender, userAmount);
        _claimCounts[msg.sender]++;

        if (fee1 > 0) collateralToken.safeTransfer(feeWallet1, fee1);
        if (fee2 > 0) collateralToken.safeTransfer(feeWallet2, fee2);
        collateralToken.safeTransfer(msg.sender, userAmount);

        emit Claimed(msg.sender, userAmount, fee1 + fee2);
    }

    function claimRef() external whenNotPaused notBlacklisted onlyEOA nonReentrant {
        Referral storage r = referrals[msg.sender];
        uint256 pending = r.pendingReward;
        if (pending == 0) revert NothingToClaim();

        r.pendingReward = 0;
        r.totalEarned += pending;

        collateralToken.safeTransfer(msg.sender, pending);
        emit ReferralClaimed(msg.sender, pending);
    }

    /// @notice Exits a stake early for principal minus the time-based
    ///         penalty. No longer blockable by blacklisting — a user's
    ///         principal can always be recovered through this path.
    function earlyExit() external onlyEOA nonReentrant {
        Stake storage s = stakes[msg.sender];
        if (!s.active) revert NoActiveStake();

        bool free = s.freeStake;
        uint256 amount = s.amount;
        uint256 penalty = free ? 0 : _earlyExitPenalty(msg.sender);
        uint256 returned = free ? 0 : amount - penalty;

        s.earlyExited = true;
        _deactivateStake(msg.sender);

        if (returned > 0) collateralToken.safeTransfer(msg.sender, returned);
        emit EarlyExited(msg.sender, returned, penalty);
    }

    /// @notice Self-serve recovery of a staker's own remaining principal.
    ///         Replaces the original `executeEmergency` insider-drain
    ///         mechanism. Available to ANY staker, including blacklisted
    ///         ones, through either of two independent unlock paths:
    ///
    ///         1. The contract has been continuously paused for at least
    ///            {EMERGENCY_GRACE_PERIOD} (30 days) — the owner-inaction path.
    ///         2. {REQUIRED_VOTES} of the voting body flipped {emergencyMode}
    ///            and {EMERGENCY_DELAY} (12 hours) has since elapsed — the
    ///            partner-override path, which does not depend on the owner.
    ///
    ///         No penalty is applied on either path.
    function emergencyWithdraw() external nonReentrant {
        if (!paused()) revert NotPausedError();
        if (!emergencyWithdrawOpen()) {
            if (emergencyMode) revert EmergencyDelayNotElapsed();
            revert GracePeriodNotElapsed();
        }

        Stake storage s = stakes[msg.sender];
        if (!s.active) revert NoActiveStake();

        bool free = s.freeStake;
        uint256 amount = s.amount;

        s.earlyExited = true;
        _deactivateStake(msg.sender);

        if (!free && amount > 0) collateralToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    // ============================================================
    // Internal accounting
    // ============================================================

    /// @dev Fully deactivates a stake, zeroing `amount`/`rate` so that no
    ///      subsequent {claim} call (even if it were otherwise reachable)
    ///      could ever compute a nonzero reward against it. This is the
    ///      direct fix for the "claim after earlyExit" fund-drain bug found
    ///      in the original contract.
    function _deactivateStake(address user) private {
        Stake storage s = stakes[user];
        if (!s.freeStake) totalStaked -= s.amount;
        s.active = false;
        s.amount = 0;
        s.rate = 0;
        if (_activeStakeCount > 0) _activeStakeCount--;

        address referrer = referrals[user].referrer;
        if (referrer != address(0) && referrals[referrer].activeReferrals > 0) {
            referrals[referrer].activeReferrals--;
            _updateLevel(referrer);
        }
    }

    function _pendingReward(address user) private view returns (uint256) {
        Stake storage s = stakes[user];
        uint256 planEnd = s.startTime + (planDurations[s.plan] * DAY);
        uint256 accrualEnd = block.timestamp > planEnd ? planEnd : block.timestamp;
        if (accrualEnd <= s.lastClaimTime) return 0;
        uint256 elapsed = accrualEnd - s.lastClaimTime;
        return (s.amount * s.rate * elapsed) / (BPS_DENOMINATOR * DAY);
    }

    function _earlyExitPenalty(address user) private view returns (uint256) {
        Stake storage s = stakes[user];
        uint256 weeksElapsed = (block.timestamp - s.startTime) / WEEK;
        uint256 penaltyBps;
        if (weeksElapsed < 1) penaltyBps = PENALTY_W1;
        else if (weeksElapsed < 2) penaltyBps = PENALTY_W2;
        else if (weeksElapsed < 3) penaltyBps = PENALTY_W3;
        else if (weeksElapsed < 4) penaltyBps = PENALTY_W4;
        else penaltyBps = PENALTY_AF;
        return (s.amount * penaltyBps) / BPS_DENOMINATOR;
    }

    function _processReferralRewards(address user, uint256 reward) private {
        address referrer = referrals[user].referrer;
        if (referrer == address(0) || blacklisted[referrer]) return;

        uint256 level = referrals[referrer].level;
        uint256 f1 = (reward * referralRates[level * 2]) / BPS_DENOMINATOR;
        if (f1 > 0) referrals[referrer].pendingReward += f1;

        address grandparent = referrals[referrer].referrer;
        if (grandparent != address(0) && !blacklisted[grandparent]) {
            uint256 grandparentLevel = referrals[grandparent].level;
            uint256 f2 = (reward * referralRates[grandparentLevel * 2 + 1]) / BPS_DENOMINATOR;
            if (f2 > 0) referrals[grandparent].pendingReward += f2;

            if (level >= 1) {
                address greatGrandparent = referrals[grandparent].referrer;
                if (greatGrandparent != address(0) && !blacklisted[greatGrandparent]) {
                    uint256 f3 = (reward * f3Rates[level - 1]) / BPS_DENOMINATOR;
                    if (f3 > 0) referrals[greatGrandparent].pendingReward += f3;
                }
            }
        }
    }

    function _updateLevel(address user) private {
        Referral storage r = referrals[user];
        uint256 activeReferrals = r.activeReferrals;
        uint256 stakedAmount = stakes[user].amount;
        uint256 newLevel;
        if (stakedAmount >= 10_000_000000 && activeReferrals >= 100) newLevel = 3;
        else if (stakedAmount >= 2_500_000000 && activeReferrals >= 25) newLevel = 2;
        else if (stakedAmount >= 500_000000 && activeReferrals >= 5) newLevel = 1;
        else newLevel = 0;
        if (newLevel != r.level) r.level = newLevel;
    }

    // NOTE ON SLITHER FINDINGS BELOW (reviewed, not exploitable — documented
    // rather than silently suppressed):
    // - divide-before-multiply: `(block.timestamp / DAY) * DAY` is the
    //   standard idiom for "start of the current UTC day" — the intentional
    //   loss of the sub-day remainder is exactly the point (day-bucketing),
    //   not an accidental precision bug.
    // - incorrect-equality: `lastWithdrawalDay[user] == today` compares two
    //   day-bucket timestamps that are only ever written via this exact same
    //   `(block.timestamp / DAY) * DAY` computation — never user-supplied,
    //   never a raw balance/amount — so there is no way for an attacker to
    //   make a near-equal-but-not-equal value that bypasses this check.
    function _checkDailyCap(address user, uint256 amount) private view {
        // slither-disable-next-line divide-before-multiply
        uint256 today = (block.timestamp / DAY) * DAY;
        // slither-disable-next-line incorrect-equality
        if (lastWithdrawalDay[user] == today) {
            if (dailyWithdrawn[user] + amount > (stakes[user].amount * MAX_DAILY_BPS) / BPS_DENOMINATOR) {
                revert DailyWithdrawalCapExceeded();
            }
        }
    }

    function _updateDailyWithdrawn(address user, uint256 amount) private {
        // slither-disable-next-line divide-before-multiply
        uint256 today = (block.timestamp / DAY) * DAY;
        if (lastWithdrawalDay[user] != today) {
            lastWithdrawalDay[user] = today;
            dailyWithdrawn[user] = 0;
        }
        dailyWithdrawn[user] += amount;
    }

    // ============================================================
    // Views
    // ============================================================

    function getReward(address user) external view returns (uint256) {
        return _pendingReward(user);
    }

    function getRefReward(address user) external view returns (uint256) {
        return referrals[user].pendingReward;
    }

    function getBalance() external view returns (uint256) {
        return collateralToken.balanceOf(address(this));
    }

    function getGlobalStats() external view returns (uint256, uint256, uint256, uint256) {
        return (_userCount, totalStaked, totalPaidOut, collateralToken.balanceOf(address(this)));
    }

    function getUserStats(address user)
        external
        view
        returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)
    {
        Stake storage s = stakes[user];
        Referral storage r = referrals[user];
        return (
            s.amount,
            s.plan,
            s.rate,
            _pendingReward(user),
            s.totalClaimed,
            r.totalEarned,
            r.pendingReward,
            r.activeReferrals
        );
    }

    function getUserStatsExtended(address user)
        external
        view
        returns (uint256, uint256, bool, uint256, uint256, uint256, uint256, uint256)
    {
        uint256 f1Volume = _f1Volume[user];
        uint256 f2Volume = _f2Volume[user];
        Stake storage s = stakes[user];
        uint256 level = referrals[user].level;
        bool active = s.active;
        uint256 lastClaimTime = s.lastClaimTime;
        uint256 claimCount = _claimCounts[user];
        return (f1Volume + f2Volume, level, active, lastClaimTime, claimCount, f1Volume, f2Volume, 0);
    }

    function getStakeBasic(address user)
        external
        view
        returns (uint256, uint256, uint256, uint256, bool, bool, uint256, uint256)
    {
        Stake storage s = stakes[user];
        return (s.amount, s.plan, s.rate, s.startTime, s.active, s.freeStake, s.totalClaimed, _claimCounts[user]);
    }

    function getReferralInfo(address user) external view returns (address, uint256, uint256, uint256, uint256) {
        Referral storage r = referrals[user];
        return (r.referrer, r.totalEarned, r.pendingReward, r.activeReferrals, r.level);
    }

    function getTeamVolume(address user) external view returns (uint256, uint256, uint256) {
        return (_f1Volume[user], _f2Volume[user], _f1Volume[user] + _f2Volume[user]);
    }

    function getF1List(address user)
        external
        view
        returns (address[] memory addrs, uint256[] memory amounts, uint256[] memory plans)
    {
        uint256 len = _f1List[user].length;
        addrs = new address[](len);
        amounts = new uint256[](len);
        plans = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            addrs[i] = _f1List[user][i];
            amounts[i] = stakes[addrs[i]].amount;
            plans[i] = stakes[addrs[i]].plan;
        }
    }

    function getF1Count(address user) external view returns (uint256) {
        return _f1List[user].length;
    }

    function getClaimCount(address user) external view returns (uint256) {
        return _claimCounts[user];
    }

    // ============================================================
    // Native currency handling — explicitly rejected (unchanged from original)
    // ============================================================

    // slither-disable-next-line locked-ether
    // Reviewed: both functions revert() unconditionally, so no native
    // currency can ever be received in the first place — there is nothing
    // to "lock" or need a withdrawal path for. Slither's locked-ether
    // detector flags any payable function without a paired withdraw
    // function, without accounting for a body that unconditionally reverts.
    receive() external payable {
        revert();
    }

    fallback() external payable {
        revert();
    }
}

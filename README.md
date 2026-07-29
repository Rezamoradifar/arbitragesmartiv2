# arbitragesmartiv2

ArbitrageSmart — AI-powered arbitrage platform. Foundry workspace for the
`ArbiSmartV2` staking + Polymarket-arbitrage contract, targeting Polygon
mainnet (chain id 137).

## What this is

This repository takes the hardened `ArbiSmartV2` from the `arbitragesmarti`
repo as its base and adds a partner-governance layer plus realized-profit
accounting for the arbitrage budget.

| Layer | Source |
| --- | --- |
| Staking, referrals, claims, early exit | Preserved from the original contract, economics unchanged |
| OZ `Ownable2Step` / `Pausable` / `ReentrancyGuard` / `SafeERC20`, custom errors, strict CEI | Hardened base |
| Real Polymarket Conditional Tokens split / merge / redeem | Hardened base |
| Partner registry + 3-of-N emergency vote | New here |
| Arbitrage profit surplus in the deployment budget | New here |

## Build and test

```bash
forge build
forge test
forge test --match-contract ArbiSmartV2InvariantTest -vv
```

The project **requires** `via_ir = true` (already set in `foundry.toml`).
`getUserStatsExtended` hits "Stack too deep" under the legacy codegen
pipeline.

Submodules are pinned — clone with them:

```bash
git clone --recurse-submodules <repo-url>
# or, in an existing clone:
git submodule update --init --recursive
```

| Dependency | Version |
| --- | --- |
| `openzeppelin-contracts` | v5.6.1 |
| `forge-std` | v1.16.2 |
| solc | 0.8.26 |

## Partner governance

A registry of up to `MAX_PARTNERS` (4) partner addresses forms a voting body
together with the owner. `REQUIRED_VOTES` (3) of that body flips
`emergencyMode`.

What the vote does:

- pauses the contract immediately;
- blocks new arbitrage deployments (`executePolymarketSplit`);
- after `EMERGENCY_DELAY` (2 days), opens `emergencyWithdraw` so **every
  staker can reclaim their full principal with no penalty** — versus the
  30-day `EMERGENCY_GRACE_PERIOD` on the owner-inaction path.

What the vote explicitly does **not** do: move a single token to a partner or
to the owner. The only address a staker's principal can reach through this
path is that staker. An earlier draft of this contract had an
`executeEmergency` that split the entire contract balance among the partner
wallets; that is an insider drain wearing a multisig's clothes, and it is not
in this codebase.

Two properties keep the check real rather than decorative:

1. `addPartner` / `removePartner` are blocked while `emergencyMode` is set,
   so the owner cannot pack or dissolve the voting body to cancel a vote
   already in flight.
2. Once `EMERGENCY_DELAY` elapses, votes can no longer be revoked and
   `unpause` stays blocked — so the escape hatch cannot be closed once it has
   opened. Passing the vote is therefore a wind-down decision, not a
   reversible scare.

The owner holds exactly one of up to five votes. Three partners can trigger
emergency mode over the owner's objection; the owner alone can neither
trigger nor block it.

```
addPartner ×N  →  voteEmergency ×3  →  [paused, arb frozen]  →  +2 days  →  emergencyWithdraw open
                        ↓ revokeEmergencyVote (only within the 2 days)
                   emergency cancelled, contract stays paused
```

## Emergency fund rescue

A last-resort response to a suspected compromise: sweep the pool's remaining
collateral to a pre-declared `recoveryWallet`. It is deliberately **not** a
button the owner can press alone.

| Guard | Effect |
| --- | --- |
| `REQUIRED_VOTES` (3) on `voteRescue` | A stolen owner key alone cannot arm it |
| `RESCUE_DELAY` (7 days) | The sweep is announced on-chain a week ahead |
| `EMERGENCY_DELAY` (2 days) | Stakers' own `emergencyWithdraw` opens 5 days *before* the sweep can fire |
| `setRecoveryWallet` frozen while votes stand | The destination cannot be re-pointed after partners approved it |
| `revokeRescueVote` never locks | Disarming is always available, right up to execution |

Reaching rescue quorum also activates `emergencyMode` — arming a sweep must
never leave stakers with a locked contract and a pending drain. Cancelling a
rescue does **not** clear emergency mode: stakers keep the exit they were
already promised.

The rescue vote is tallied **separately** from the emergency vote. Winding
the pool down and sweeping it to a recovery wallet are different decisions,
and a partner who agreed to the first has not thereby agreed to the second.

```
voteRescue ×3  →  [armed, emergency on, paused]  →  +2d  stakers withdraw  →  +7d  executeRescue
                        ↓ revokeRescueVote (always available)
                   sweep disarmed, emergency mode stays on
```

> Set `recoveryWallet` before you need it — `executeRescue` reverts with
> `NoRecoveryWallet` if it was never configured. A multisig is the right
> destination here; an EOA reintroduces the single-key risk the mechanism
> exists to mitigate.

## Arbitrage: where the money can and cannot go

Every arbitrage path ends in **contract-held** positions or collateral. There
is no function that sends pooled staker collateral to a wallet.

- `executePolymarketSplit` converts pooled collateral into a complete set of
  outcome tokens held by this contract, capped by
  `polymarketArbitrageAvailable()`.
- `executePolymarketMerge` and `executePolymarketRedeem` bring collateral
  back. Neither is gated on `whenNotPaused` — unwinding matters most exactly
  when the contract is paused, and gating them would strand collateral in
  open positions while stakers are trying to withdraw.
- `depositArbitrageProfit` moves value **in** only, crediting the amount
  actually received (balance delta, so a fee-on-transfer token cannot inflate
  the budget).

### Deployment budget

The cap is **cumulative**, measured against total assets — not a flat
percentage of the current balance:

```
totalAssets()                  = liquid balance + totalArbitrageDeployed
arbitrageDeploymentCeiling()   = totalAssets × ARBITRAGE_MAX_BPS / 10000
                               + totalArbitrageProfit

polymarketArbitrageAvailable() = min(ceiling − deployed, liquid balance)
                                 (0 once deployed reaches the ceiling)
```

A per-call percentage cap is not a cap: each split shrinks the balance the
next one is measured against, so repeated calls converge on the whole pool —
40 were enough to move 99%+ of collateral into outcome tokens and leave
`emergencyWithdraw` reverting for lack of liquidity. Because a split moves
value between the two halves of `totalAssets` and leaves the total unchanged,
the ceiling above does not recede as it is consumed.

`ARBITRAGE_MAX_BPS` is 20% (the hardened base's bound, kept as-is).
`totalArbitrageProfit` accrues only **net** realized profit — redemption
proceeds above tracked principal, minus the performance fee — so the budget
never grows on money that was paid out as a fee, and principal the pool
itself split into a position is never counted as profit.

A performance fee (`profitFeeBPS`, default 10%, hard-capped at
`PROFIT_FEE_MAX_BPS` = 20%) goes to `profitRecipient` on realized redemption
profit only. That is a separate role from `feeWallet1` / `feeWallet2`, which
are funded from staking-yield claims.

## Deployed instance

Live on **Polygon mainnet** (chain id 137):

| | |
| --- | --- |
| Contract | [`0x1Eb07993f2842dc9BB0B69dADE1d033324246768`](https://polygonscan.com/address/0x1Eb07993f2842dc9BB0B69dADE1d033324246768) |
| Deploy tx | [`0x1945a997e43cb7bedd7eafdb3dde0280cb0a2d5ab9e6e9d7937a13316526aec6`](https://polygonscan.com/tx/0x1945a997e43cb7bedd7eafdb3dde0280cb0a2d5ab9e6e9d7937a13316526aec6) |
| Block | 91081649 |
| Owner | `0x0C52DDb2F4147A4FD8A749F988Ab41A6E201669A` |
| Collateral | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (Tether on Polygon, on-chain symbol `USDT0`) |
| Fee wallets / profit recipient | All three set to the owner address; changeable via `setFeeWallets` / `setProfitRecipient` |

Constructor state was read back from chain after deployment and matches.

> **Source is not yet verified on PolygonScan.** Verification needs a
> `POLYGONSCAN_API_KEY`; run the `forge verify-contract` command below once you
> have one.

> **The collateral token is USDT, not the USDC.e that Polymarket markets are
> collateralized in.** `collateralToken` is immutable, so this is fixed for the
> life of this deployment: staking, referrals, claims and exits all work
> normally, but `executePolymarketSplit` / `Merge` / `Redeem` cannot interact
> with real Polymarket conditions. Using the arbitrage engine would require a
> fresh deployment against USDC.e.

Post-deploy checklist:

1. Register partners — `addPartner` once per address, from the owner wallet.
2. Set the recovery wallet — `setRecoveryWallet`, before any rescue vote exists.
3. Split the fee roles if the owner address should not receive all three.
4. Verify the source on PolygonScan.

Note that the 24-hour free-stake window starts at deployment: during it, a
stake must be exactly 10 USDT and is recorded as a free position.

## Deployment

```bash
cp .env.example .env
# fill in PRIVATE_KEY, COLLATERAL_TOKEN, FEE_WALLET_1/2, PROFIT_RECIPIENT,
# POLYGONSCAN_API_KEY

forge script script/Deploy.s.sol:Deploy \
  --rpc-url polygon \
  --broadcast \
  --verify \
  -vvvv
```

`INITIAL_OWNER` defaults to `0x0C52DDb2F4147A4FD8A749F988Ab41A6E201669A`, the
project's designated permanent owner, so a deploy can never silently land
ownership on the deployer key by omission. The deployer key pays gas only and
should not be the owner.

> The default owner is an externally owned account. A Gnosis Safe multisig or
> an OpenZeppelin `TimelockController` is the stronger choice for a single
> point of control, and the contract accepts either as `owner()` with no code
> changes. The partner voting body above is the mitigation in place for the
> EOA setup.

`COLLATERAL_TOKEN` **must** be the exact token the target Polymarket
condition was prepared with — Polygon USDC.e
(`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`) for standard Polymarket
markets. Verify against the specific market before deploying; a mismatch
produces a valid-but-untradeable position set.

Partners are **not** registered by the deploy script. Call `addPartner` once
per partner from the owner address afterward — the deployer key has no
authority to seed the voting body.

If in-broadcast verification fails because PolygonScan has not indexed the
transaction yet, re-run it standalone:

```bash
forge verify-contract <deployed-address> src/ArbiSmartV2.sol:ArbiSmartV2 \
  --chain 137 \
  --constructor-args $(cast abi-encode \
    "constructor(address,address,address,address,address)" \
    <collateral> <owner> <feeWallet1> <feeWallet2> <profitRecipient>)
```

## Known limitations

- **Order-book profit is not realizable on-chain.** Polymarket's CTF Exchange
  is `onlyOperator`, so this contract cannot place order-book trades. It
  interacts only with the permissionless Conditional Tokens contract:
  split, merge, and redeem-after-resolution. `POLYMARKET_CTF_EXCHANGE` and
  `POLYMARKET_NEG_RISK_EXCHANGE` are recorded as constants for reference and
  are never called.
- **Position IDs are not derived on-chain.** `getPolymarketOutcomeBalance`
  takes a position ID computed off-chain.
- **Redemption profit is measured per condition, by balance delta.**
  `executePolymarketRedeem` retires `committedByCondition` only by the amount
  actually recovered, so redeeming a position across several calls is handled
  correctly and principal is never billed as profit. It does write state
  after the external call — unavoidable for a balance-delta measurement, and
  safe under `onlyOwner` + `nonReentrant` against a fixed trusted address.
- **Staking economics are unaudited as a business model.** Daily rates, plan
  durations, the referral tables, and the penalty schedule are carried over
  unchanged from the original contract. They are product parameters, not
  security fixes, and this repo does not assert they are sustainable.

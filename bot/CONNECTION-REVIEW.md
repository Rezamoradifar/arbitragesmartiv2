# Polymarket execution connection review — 2026-09-21

The frontend now reads and validates the existing `trading-bot-status.json` publisher format every minute on `/polymarket` and `/strategy`. Missing files, invalid records, failed refreshes and reports older than 30 minutes are explicit. A newly published file cannot make an old `lastRunAt` fresh. Negative bot-reported P&L remains negative. Counts and P&L are operator telemetry, not independently verified fills. No new trading trigger was added.

## Why automatic execution was not enabled

1. `execute.mjs` is an off-chain executor using a separate wallet. Contract split/merge/redeem calls do not themselves submit or match CLOB orders. Pool funds are not automatically available to this executor, and depositing wallet profits into the pool is a separate owner operation.
2. The checked-in executor uses `@polymarket/clob-client` v5 and USDC.e collateral. Current official documentation describes the unified `@polymarket/client` SDK and pUSD collateral flows. The old signing/settlement assumptions require migration and verification against the intended markets before any funded execution.
3. `placeBothLegs` submits separate FOK orders sequentially. FOK applies to each order individually. If the first fills and the second fails, a directional position remains. It is not an atomic two-leg trade.
4. The trade-budget expression based on shares times the cheaper side does not represent the total cost of both buy legs. Limits need to account for the complete set, fees and residual exposure.
5. Status can be written after an error without independent reconciliation. A reported live mode is configuration, not proof of healthy execution or realized profit.

Required implementation before a funded rollout: current SDK/wallet/collateral migration, correct total notional limits, fill reconciliation and idempotency, partial-leg handling with bounded loss/exposure, separately authorized trader wallet and spending limits, and end-to-end dry-run validation. An owner must approve and sign any actual allowance, fund movement or settlement transaction. Do not paste keys into chat or public frontend configuration.

Public references checked:
- https://docs.polymarket.com/getting-started/typescript
- https://docs.polymarket.com/concepts/pusd
- https://docs.polymarket.com/trading/place-orders

This review did not access wallet keys, run the executor or Telegram watcher, change on-chain settings, submit orders, or deploy contracts.

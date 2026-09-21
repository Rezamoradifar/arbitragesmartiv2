# Homepage market data

The homepage puts a public market monitor before the protocol's on-chain
balance sheet. It does not place orders, connect exchange accounts, modify the
contract or report monitored spreads as ArbiSmart returns.

## Sources and refresh

| Surface | Source | Refresh / freshness |
| --- | --- | --- |
| Spot spreads | OKX `/api/v5/market/tickers?instType=SPOT`, KuCoin `/api/v1/market/allTickers` | Browser 15s; server request coalescing and 10s cache; exchange timestamps expire after 60s |
| Prediction markets | Polymarket Gamma `/markets` | Browser 60s; server 60s snapshot; stale label after 180s |
| Complete-set scanner | `/arbitrage-status.json`, published by the existing `bot/publish-scan.mjs` job | Browser 60s; report stale after 30 minutes |
| Protocol balances | Existing Polygon contract reads | Existing 15s interval; successful query timestamp shown |

Provider requests time out after six seconds. Partial feeds stay visible;
missing results never become zero balances, fabricated opportunities, green
live indicators or normal protocol status. No private API keys are needed.
Deployment must allow outbound HTTPS to `www.okx.com`, `api.kucoin.com` and
`gamma-api.polymarket.com`. Provider or jurisdiction restrictions may make one
or more sources unavailable. Do not work around a provider restriction; keep
the explicit unavailable state.

## Spread calculation

Only BTC, ETH, SOL, XRP, DOGE and LINK spot pairs quoted in USDT are compared.
For each asset, compare both directions across distinct exchanges and retain
the better one. Quotes more than 15 seconds apart are not compared.

- Gross: `(sell bid / buy ask - 1) * 100`.
- After assumed fees: `(sell bid * (1 - f) / (buy ask * (1 + f)) - 1) * 100`.
- `f` defaults to 10 basis points (0.10%) **on each leg** and is editable from
  0 to 100 bps. It is a user assumption, not an account-specific fee lookup.
- Depth, inventory, transfer fees, slippage and settlement are not modelled.
  A positive indication does not establish executable or guaranteed profit.
- Negative spreads remain negative. A missing quote means unavailable.

Primary provider references:
- [OKX market data](https://www.okx.com/docs-v5/en/#order-book-trading-market-data-get-tickers)
- [KuCoin all tickers](https://www.kucoin.com/docs-new/rest/spot-trading/market-data/get-all-tickers)
- [Polymarket market data](https://docs.polymarket.com/developers/gamma-markets-api/overview)

## Company documents

No authentic company registration, financial authorization or independent
audit document was supplied for this change. The section says so explicitly.
`lib/company-documents.ts` is intentionally empty. To publish a real document:

1. Check the document against its issuer's record and verify its scope.
2. Add the supplied image under `public/company-documents/`.
3. Add the real title, category, issuer, reference, image path and HTTPS issuer
   verification link to `COMPANY_DOCUMENTS`.

Do not generate certificate images or use protocol/provider branding as an
endorsement. Sourcify source verification and a Polygon explorer record are
technical records, not regulatory approval.

## UI scope

Removed from the homepage: the $15m growth target, repeated feature blocks and
the gold promotion banner. Their existing routes remain available. Existing
wallet and transaction flows remain intact. Fees, exit penalties, protocol
liquidity information and the strategy link remain accessible on the homepage.

`npm run dev` is still Next.js. Its small wrapper also accepts the managed
preview's `--host` and `--strictPort` arguments. When a production build already
exists, the supervised preview serves that exact build; ordinary development
still uses Next dev. Production build/start and the
existing VPS deployment workflow are unchanged.

## Verification

Run `npm ci`, `npm run test:market`, `npm run lint`, `npx tsc --noEmit` and
`npm run build`. Test cases cover quote parsing, bid/ask direction, both fee
legs, negative spreads, invalid inputs, stale/future timestamps and quote skew.
For UI review, check filters, market search, fee input, refresh, unavailable
states, the calculator disclosure, FAQ, themes and narrow-screen scrolling.

## Polymarket Live page and reserves

`/polymarket` displays the twelve public markets returned by the Gamma endpoint,
with search, a manual refresh and automatic one-minute updates. The homepage
still shows six. It also shows the existing scanner's best estimated gain and
match count; these estimates are suppressed after 30 minutes. Invalid reports,
including inconsistent counts and non-numeric profit, are rejected.

The profit-credit metric comes from `totalArbitrageProfit`. It must not be
labelled as Polymarket-only realized trading P&L: the contract also lets the
owner deposit externally earned profit into this total. Recent
`ArbitrageProfitAccrued` events are queried from exactly the latest 180 Polygon
blocks in four bounded ranges. The page labels that range, refreshes every
minute, links to each transaction, and marks stale or unavailable responses.
Any failed range makes the refresh unavailable, not an empty successful result.
It does not pretend that the bounded event window is the full trade history.

The long homepage strategy-capital/coverage panel has been removed. A compact
asset-coverage disclosure links to `/transparency`, which holds the reserve
report and balance sheet. Coverage uses total assets after unswept fees divided
by recorded principal; the report does not infer the cause of a shortfall.

The requested `arbhub.com` is available as an ICANN registration lookup link.
At review time its website displayed eCorp/VentureOS material, so neither domain
ownership nor affiliation with this project has been asserted. Domain records
are not financial licenses. No authentic license image has been supplied, and
none is fabricated or borrowed from a different entity.

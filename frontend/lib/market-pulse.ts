export const ASSETS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "LINK"] as const;
export type Asset = (typeof ASSETS)[number];
export type Venue = "OKX" | "KuCoin";
export const QUOTE_MAX_AGE = 60_000;
export const MAX_QUOTE_SKEW = 15_000;

export type Quote = {
  asset: Asset;
  venue: Venue;
  bid: number;
  ask: number;
  last: number;
  change24h: number | null;
  timestamp: number;
};
export type MarketPulse = {
  fetchedAt: number;
  quotes: Quote[];
  sources: { venue: Venue; status: "available" | "unavailable"; url: string }[];
};
export type Spread = {
  asset: Asset;
  buy: Quote;
  sell: Quote;
  grossPct: number;
  afterFeesPct: number;
};

export function isFreshQuote(q: Quote, now: number): boolean {
  return (
    ASSETS.includes(q.asset) &&
    [q.bid, q.ask, q.last, q.timestamp].every(Number.isFinite) &&
    q.bid > 0 &&
    q.ask >= q.bid &&
    q.last > 0 &&
    q.timestamp <= now + 5_000 &&
    now - q.timestamp <= QUOTE_MAX_AGE
  );
}

/** Compare simultaneous USDT quotes. Fees are assumptions, not fetched account rates.
 * This is a top-of-book indication: depth, transfers and slippage are not modelled. */
export function compareQuotes(
  quotes: Quote[],
  now: number,
  feeBps = 10,
): Spread[] {
  if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 100) return [];
  const fresh = quotes.filter((q) => isFreshQuote(q, now));
  return ASSETS.flatMap((asset) => {
    const pair = fresh.filter((q) => q.asset === asset);
    const routes = pair.flatMap((buy) =>
      pair
        .filter(
          (sell) =>
            sell.venue !== buy.venue &&
            Math.abs(sell.timestamp - buy.timestamp) <= MAX_QUOTE_SKEW,
        )
        .map((sell) => ({
          asset,
          buy,
          sell,
          grossPct: (sell.bid / buy.ask - 1) * 100,
          afterFeesPct:
            ((sell.bid * (1 - feeBps / 10_000)) /
              (buy.ask * (1 + feeBps / 10_000)) -
              1) *
            100,
        })),
    );
    return routes.sort((a, b) => b.afterFeesPct - a.afterFeesPct).slice(0, 1);
  });
}

function number(value: unknown): number {
  return Number(value);
}
function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (x): x is Record<string, unknown> => !!x && typeof x === "object",
      )
    : [];
}

export function parseOkx(payload: unknown): Quote[] {
  const p = payload as { code?: string; data?: unknown } | null;
  if (p?.code !== "0") return [];
  return rows(p.data).flatMap((r) => {
    const asset = ASSETS.find((a) => r.instId === `${a}-USDT`);
    if (!asset) return [];
    const open = number(r.open24h),
      last = number(r.last);
    return [
      {
        asset,
        venue: "OKX" as const,
        bid: number(r.bidPx),
        ask: number(r.askPx),
        last,
        change24h:
          Number.isFinite(open) && open > 0 ? (last / open - 1) * 100 : null,
        timestamp: number(r.ts),
      },
    ];
  });
}

export function parseKucoin(payload: unknown): Quote[] {
  const p = payload as {
    code?: string;
    data?: { time?: unknown; ticker?: unknown };
  } | null;
  if (p?.code !== "200000") return [];
  return rows(p.data?.ticker).flatMap((r) => {
    const asset = ASSETS.find((a) => r.symbol === `${a}-USDT`);
    if (!asset) return [];
    const change = number(r.changeRate);
    return [
      {
        asset,
        venue: "KuCoin" as const,
        bid: number(r.buy),
        ask: number(r.sell),
        last: number(r.last),
        change24h: Number.isFinite(change) ? change * 100 : null,
        timestamp: number(p.data?.time),
      },
    ];
  });
}

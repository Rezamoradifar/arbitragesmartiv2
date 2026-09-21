import {
  isFreshQuote,
  parseKucoin,
  parseOkx,
  type MarketPulse,
  type Venue,
} from "@/lib/market-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sources = [
  {
    venue: "OKX" as Venue,
    url: "https://www.okx.com/api/v5/market/tickers?instType=SPOT",
    parse: parseOkx,
  },
  {
    venue: "KuCoin" as Venue,
    url: "https://api.kucoin.com/api/v1/market/allTickers",
    parse: parseKucoin,
  },
];
let cached: MarketPulse | undefined;
let pending: Promise<MarketPulse> | undefined;

async function load(): Promise<MarketPulse> {
  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        const response = await fetch(s.url, {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(6_000),
        });
        if (!response.ok) throw new Error("Source unavailable");
        const quotes = s
          .parse(await response.json())
          .filter((q) => isFreshQuote(q, Date.now()));
        return {
          quotes,
          source: {
            venue: s.venue,
            url: s.url,
            status: quotes.length
              ? ("available" as const)
              : ("unavailable" as const),
          },
        };
      } catch {
        return {
          quotes: [],
          source: {
            venue: s.venue,
            url: s.url,
            status: "unavailable" as const,
          },
        };
      }
    }),
  );
  return {
    fetchedAt: Date.now(),
    quotes: results.flatMap((r) => r.quotes),
    sources: results.map((r) => r.source),
  };
}

export async function GET() {
  // Deduplicate concurrent visitors and bound upstream traffic without
  // relabelling old exchange timestamps as live on cache hits.
  if (!cached || Date.now() - cached.fetchedAt >= 10_000) {
    pending ??= load()
      .then((value) => (cached = value))
      .finally(() => {
        pending = undefined;
      });
    await pending;
  }
  return Response.json(cached, { headers: { "Cache-Control": "no-store" } });
}

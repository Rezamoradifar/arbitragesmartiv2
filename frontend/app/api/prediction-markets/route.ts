import {
  fetchTopPolymarketMarkets,
  type PolymarketMarket,
} from "@/lib/polymarket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let snapshot: { markets: PolymarketMarket[]; fetchedAt: number } | undefined;
let pending: Promise<void> | undefined;
let lastAttempt = 0;

export async function GET() {
  if (
    (!snapshot || Date.now() - snapshot.fetchedAt > 60_000) &&
    Date.now() - lastAttempt > 10_000
  ) {
    pending ??= (async () => {
      lastAttempt = Date.now();
      try {
        const markets = await fetchTopPolymarketMarkets(12);
        if (markets.length) snapshot = { markets, fetchedAt: Date.now() };
      } catch {
        /* Keep the original timestamp on a last-known snapshot. */
      }
    })().finally(() => {
      pending = undefined;
    });
  }
  if (pending) await pending;
  return Response.json(snapshot ?? { markets: [], fetchedAt: null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

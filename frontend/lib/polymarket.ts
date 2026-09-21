export type PolymarketMarket = {
  question: string;
  slug: string;
  yesPrice: number;
  outcomeLabel: string;
  volume24hr: number;
  liquidity: number;
  endDate: string | null;
  imageUrl: string | null;
};

type GammaMarket = {
  image?: string;
  icon?: string;
  question?: string;
  slug?: string;
  outcomes?: string;
  outcomePrices?: string;
  volume24hr?: string | number;
  liquidity?: string | number;
  endDate?: string;
  events?: Array<{ slug?: string }>;
};

function parseJsonArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Reads a handful of the highest-volume active markets from Polymarket's
 * public Gamma API (no key required, read-only). This is real, live market
 * data — the same order book ArbiSmart's arbitrage strategy watches for
 * mispriced YES/NO pairs — not anything the contract has traded.
 */
export async function fetchTopPolymarketMarkets(limit = 6): Promise<PolymarketMarket[]> {
  const url = `https://gamma-api.polymarket.com/markets?limit=${limit}&active=true&closed=false&order=volume24hr&ascending=false`;

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];

  const raw = (await res.json()) as GammaMarket[];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((m): PolymarketMarket | null => {
      const outcomes = parseJsonArray(m.outcomes);
      const prices = parseJsonArray(m.outcomePrices);
      const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
      const priceStr = prices[yesIdx >= 0 ? yesIdx : 0];
      const yesPrice = priceStr ? Number(priceStr) : NaN;
      if (!m.question || !Number.isFinite(yesPrice) || yesPrice < 0 || yesPrice > 1) return null;

      return {
        question: m.question,
        slug: m.events?.[0]?.slug ?? m.slug ?? "",
        yesPrice,
        outcomeLabel: outcomes[yesIdx >= 0 ? yesIdx : 0] ?? "Outcome",
        volume24hr: Number(m.volume24hr ?? 0),
        liquidity: Number(m.liquidity ?? 0),
        endDate: m.endDate ?? null,
        imageUrl: marketImage(m.icon ?? m.image),
      };
    })
    .filter((m): m is PolymarketMarket => m !== null);
}

// Only provider-hosted HTTPS thumbnails are displayed; arbitrary API URLs are ignored.
function marketImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "polymarket-upload.s3.us-east-2.amazonaws.com" && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

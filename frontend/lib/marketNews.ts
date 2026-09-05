/**
 * Parses Cointelegraph's public RSS feed — no API key, no account, nothing to
 * pay for or leak. A regex scan over <item> blocks rather than an XML
 * dependency: the feed's shape is small and stable enough that adding a
 * parser package would outweigh what it buys here.
 */

export type MarketNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

const FEED_URL = "https://cointelegraph.com/rss";

/** Site-relevant keywords: an item matching one of these is shown first. */
const RELEVANT = [
  "defi",
  "stablecoin",
  "usdt",
  "usdc",
  "polygon",
  "matic",
  "staking",
  "stake",
  "yield",
  "arbitrage",
  "liquidity",
];

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function tag(block: string, name: string): string | null {
  const cdata = new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`).exec(block);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(block);
  return plain ? decodeEntities(plain[1].trim()) : null;
}

export async function fetchMarketNews(limit = 6): Promise<MarketNewsItem[]> {
  const res = await fetch(FEED_URL, {
    headers: { "user-agent": "ArbiSmart/1.0 (+https://arbhub.site)" },
    // The feed updates hourly per its own <sy:updateFrequency>; polling it
    // more often than that would just be re-fetching the same items.
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`feed responded ${res.status}`);
  const xml = await res.text();

  const items: MarketNewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const title = tag(block, "title");
    const link = tag(block, "link");
    const pubDate = tag(block, "pubDate");
    if (!title || !link || !pubDate) continue;
    const parsed = new Date(pubDate);
    if (Number.isNaN(parsed.getTime())) continue;
    items.push({
      title,
      url: link.split("?")[0],
      source: "Cointelegraph",
      publishedAt: parsed.toISOString(),
    });
  }

  const isRelevant = (item: MarketNewsItem) => {
    const t = item.title.toLowerCase();
    return RELEVANT.some((kw) => t.includes(kw));
  };

  const relevant = items.filter(isRelevant);
  const rest = items.filter((item) => !isRelevant(item));
  return [...relevant, ...rest].slice(0, limit);
}

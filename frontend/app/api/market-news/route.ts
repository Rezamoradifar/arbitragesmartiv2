import { fetchMarketNews } from "@/lib/marketNews";

/**
 * External crypto/DeFi headlines for the homepage — real, sourced, linked
 * back to the original article. No API key: Cointelegraph's public RSS feed
 * needs none, so there is no credential to configure or leak.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await fetchMarketNews(6);
    return Response.json({ items }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ items: [] }, { headers: { "cache-control": "no-store" } });
  }
}

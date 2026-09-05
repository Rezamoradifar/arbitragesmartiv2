import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serves the platform's public updates feed to the homepage.
 *
 * The source of truth is docs/telegram-content-bank.json — the same
 * verified, contract-sourced facts already published to the public Telegram
 * channel. Re-reading it here rather than duplicating the content means the
 * site can never show a fact the channel doesn't, or a stale copy of one
 * that changed. Only items already posted (postedAt set) are returned, so
 * the feed never leaks a fact before it's actually gone out.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankItem = {
  id: string;
  postedAt: string | null;
  text: string;
};

const BANK_PATH = path.join(process.cwd(), "..", "docs", "telegram-content-bank.json");

export async function GET() {
  let items: BankItem[] = [];
  try {
    const raw = await readFile(BANK_PATH, "utf8");
    const data = JSON.parse(raw);
    items = Array.isArray(data) ? data : data.items;
  } catch {
    return Response.json({ items: [] }, { headers: { "cache-control": "no-store" } });
  }

  const posted = items
    .filter((item) => item.postedAt)
    .sort((a, b) => (b.postedAt! > a.postedAt! ? 1 : -1))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      postedAt: item.postedAt,
      // The hashtag line is for Telegram discovery, not a card on the site.
      text: item.text.replace(/\n\n#[\s\S]*$/, "").trim(),
    }));

  return Response.json({ items: posted }, { headers: { "cache-control": "no-store" } });
}

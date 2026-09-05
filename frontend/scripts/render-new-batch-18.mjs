#!/usr/bin/env node
/**
 * One-off: renders cards for a small refill batch of new, previously-unused
 * verified contract facts, using the same plain flat-gradient template and
 * category-color logic as render-telegram-cards.mjs, then appends the items
 * to the content bank (does not touch any existing item).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const BANK_PATH = `${REPO_ROOT}docs/telegram-content-bank.json`;
const OUT_DIR = `${REPO_ROOT}docs/telegram-cards`;
const TEMPLATE = readFileSync(new URL("./telegram-card-template.html", import.meta.url), "utf8");

const GOLD = { fg: "#e0ad3c", border: "rgba(224,173,60,0.28)", bg: "rgba(224,173,60,0.07)" };

const NEW_ITEMS = [
  {
    id: "referral-tier-requires-real-volume",
    category: "Referral",
    text: "An earlier version gated referral tiers on headcount alone, which prices a tier in wallets rather than capital — a hundred throwaway accounts cost less to create than the top tier was worth. This version requires real staked volume too, and volume can't be faked cheaply. Headcount survives only as a floor, so one large referral can't carry a tier alone.\n\n#ArbiSmart #Polygon #USDT #Referral",
  },
  {
    id: "grantstake-fixes-v2-promo-hole",
    category: "Transparency",
    text: "An earlier version's free promotional packages had no collateral behind them — the yield they drew came straight out of other depositors' principal, and the better the promotion worked, the bigger that hole got. The current grant mechanism instead requires the owner to fund it up front from marketing budget, so a promotion's cost sits with whoever ran it, never with other stakers.\n\n#ArbiSmart #Polygon #USDT #Transparency",
  },
];

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bodySizeFor(len) {
  if (len < 260) return 34;
  if (len < 340) return 31;
  return 28;
}

function buildHtml(item) {
  const [body] = item.text.split(/\n\n(?=#)/);
  const size = bodySizeFor(body.length);
  return TEMPLATE
    .replace("CHIP_COLOR", GOLD.fg)
    .replace("CHIP_BORDER", GOLD.border)
    .replace("CHIP_BG", GOLD.bg)
    .replace("CHIP_LABEL", item.category)
    .replace("BODY_SIZE", String(size))
    .replace("BODY_TEXT", escapeHtml(body).replace(/\n/g, "<br>"));
}

const SCRATCH = `${tmpdir()}/telegram-card-render-batch18-${Date.now()}`;
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });

const bank = JSON.parse(readFileSync(BANK_PATH, "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 })).newPage();

for (const item of NEW_ITEMS) {
  const html = buildHtml(item);
  const tmpPath = `${SCRATCH}/${item.id}.html`;
  writeFileSync(tmpPath, html);
  await page.goto(`file://${tmpPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const outPath = `${OUT_DIR}/${item.id}.png`;
  await page.locator(".card").screenshot({ path: outPath });
  console.log("rendered", item.id);

  bank.items.push({
    id: item.id,
    postedAt: null,
    text: item.text,
    image: `docs/telegram-cards/${item.id}.png`,
  });
}

await browser.close();
writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nAppended ${NEW_ITEMS.length} new items to the content bank.`);

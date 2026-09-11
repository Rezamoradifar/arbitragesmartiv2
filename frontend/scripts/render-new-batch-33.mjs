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
    id: "claim-fee-combined-rate-immutable",
    category: "Security",
    text: "The yield-claim fee's combined rate is a hard constant at the code level — 10% total, split evenly between two wallets — and that's the one fee on the entire contract that not even the owner can raise after deployment. An earlier version split the same combined rate unevenly between wallets; what a user actually pays has always totalled the same number.\n\n#ArbiSmart #Polygon #USDT #Security",
  },
  {
    id: "free-stake-cap-raised-because-liability-is-conditional",
    category: "Security",
    text: "Free promotional positions are capped at 100 in this version, up from just 3 in an earlier one — safe to raise because the free liability is now conditional, not automatic. Claiming stays locked until the holder deposits real collateral, and neither exit path ever returns the free principal itself, so a free position that never converts into a real stake costs the pool nothing.\n\n#ArbiSmart #Polygon #USDT #Security",
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

const SCRATCH = `${tmpdir()}/telegram-card-render-batch33-${Date.now()}`;
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

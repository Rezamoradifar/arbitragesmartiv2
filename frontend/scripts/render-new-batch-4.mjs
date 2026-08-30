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
    id: "blacklist-cant-freeze-principal",
    category: "Security",
    text: "A blacklist flag exists, but it can only block new stakes, top-ups, plan upgrades, and claiming — never earlyExit or emergencyWithdraw. Whatever a wallet is flagged for, its principal can never be permanently frozen by this switch. The owner can't even blacklist themselves; that path is closed off in the code.\n\n#ArbiSmart #Polygon #USDT #Security",
  },
  {
    id: "unpause-blocked-during-emergency",
    category: "Security",
    text: "Once the partner body votes emergency mode active, the owner cannot unpause the contract to undo it — that path is blocked while emergency mode is set. A vote that passes is a one-way wind-down decision; stakers exit through emergencyWithdraw, not a switch the owner can flip back.\n\n#ArbiSmart #Polygon #USDT #Security",
  },
  {
    id: "partner-list-frozen-during-emergency",
    category: "Security",
    text: "Adding or removing a partner is blocked the moment emergency mode is active. The owner can't shrink the voting body mid-vote to cancel a rescue or an emergency exit already in flight — the people who can vote are locked in before the vote even starts moving.\n\n#ArbiSmart #Polygon #USDT #Security",
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

const SCRATCH = `${tmpdir()}/telegram-card-render-batch4-${Date.now()}`;
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

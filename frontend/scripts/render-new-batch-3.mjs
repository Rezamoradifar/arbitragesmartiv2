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
    id: "onlyeoa-no-bots",
    category: "Security",
    text: "Staking calls require tx.origin to equal msg.sender — a plain wallet, not a smart-contract intermediary. It's a participation rule, not a permission check: nothing here is authorized based on tx.origin, it can only narrow who's allowed to call in, so none of the classic tx.origin-phishing risk applies.\n\n#ArbiSmart #Polygon #USDT #Security",
  },
  {
    id: "fee-withdrawal-capped",
    category: "Transparency",
    text: "Owner fee withdrawals aren't limited by policy, they're limited by arithmetic — three checks, every time: can't exceed that budget's own uncollected balance, can't exceed the contract's actual liquid balance, and can't dip into what non-fee liabilities need. There's no path from here to a single dollar of staked principal.\n\n#ArbiSmart #Polygon #USDT #Security #Transparency",
  },
  {
    id: "dashboard-one-call",
    category: "HowTo",
    text: "Two read-only functions, dashboard() and userDepositBreakdown(), return the whole picture in one call each — gross deposits, fees collected, net stakes, pool balance, what's deployed to arbitrage; per-user gross, fee paid, net stake, active stake. No login, no dashboard we control, callable by anyone directly against the contract.\n\n#ArbiSmart #Polygon #USDT #Transparency #HowTo",
  },
  {
    id: "grantstake-real-funds",
    category: "Transparency",
    text: "grantStake exists for the owner to seed a promotional or migrated position — but it isn't free money out of thin air: the same amount has to actually leave the owner's wallet and land in the contract, transferred and balance-checked exactly like a real user deposit. No mechanism here mints stake without matching collateral arriving.\n\n#ArbiSmart #Polygon #USDT #Security #Transparency",
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

const SCRATCH = `${tmpdir()}/telegram-card-render-batch3-${Date.now()}`;
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

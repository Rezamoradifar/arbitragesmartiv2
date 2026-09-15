#!/usr/bin/env node
/**
 * Pre-renders one branded card PNG per content-bank item, once, so the
 * scheduled posting routine never has to run a browser unattended.
 *
 *   node frontend/scripts/render-telegram-cards.mjs
 *
 * A render that silently breaks — a font that fails to load through a proxy
 * at 8am UTC, a Playwright launch that hangs — is not something the routine
 * can notice or recover from on its own. Rendering everything now, while a
 * person can look at the output, turns "generate an image" into "pick a file
 * that already exists and was checked" for every future firing.
 *
 * Writes docs/telegram-cards/<id>.png for every item and adds an "image"
 * field (repo-relative path) to each item in the content bank, so the
 * routine's job shrinks to: read the item, sendPhoto with its image, done.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const BANK_PATH = `${REPO_ROOT}docs/telegram-content-bank.json`;
const OUT_DIR = `${REPO_ROOT}docs/telegram-cards`;
const TEMPLATE = readFileSync(new URL("./telegram-card-template.html", import.meta.url), "utf8");

// Intermediate HTML lives outside the committed output directory — nothing
// but the final PNGs and the updated JSON should show up in `git status`.
const SCRATCH = `${tmpdir()}/telegram-card-render-${Date.now()}`;
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });

const STANDARD_TAGS = new Set(["ArbiSmart", "Polygon", "USDT"]);
const RED = { fg: "#f0806b", border: "rgba(240,128,107,0.4)", bg: "rgba(240,128,107,0.1)" };
const GOLD = { fg: "#e0ad3c", border: "rgba(224,173,60,0.28)", bg: "rgba(224,173,60,0.07)" };

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bodySizeFor(len) {
  if (len < 260) return 34;
  if (len < 340) return 31;
  return 28;
}

function buildHtml(item) {
  const [body, tagLine] = item.text.split(/\n\n(?=#)/);
  const tags = (tagLine ?? "").match(/#\w+/g)?.map((t) => t.slice(1)) ?? [];
  const category = tags.find((t) => !STANDARD_TAGS.has(t)) ?? "Update";
  const colors = category === "Scam" ? RED : GOLD;
  const size = bodySizeFor(body.length);

  return TEMPLATE
    .replace("CHIP_COLOR", colors.fg)
    .replace("CHIP_BORDER", colors.border)
    .replace("CHIP_BG", colors.bg)
    .replace("CHIP_LABEL", category === "DeFi" ? category : category.replace(/([a-z])([A-Z])/g, "$1 $2"))
    .replace("BODY_SIZE", String(size))
    .replace("BODY_TEXT", escapeHtml(body).replace(/\n/g, "<br>"));
}

const bank = JSON.parse(readFileSync(BANK_PATH, "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 })).newPage();

for (const item of bank.items) {
  const html = buildHtml(item);
  const tmpPath = `${SCRATCH}/${item.id}.html`;
  writeFileSync(tmpPath, html);
  await page.goto(`file://${tmpPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const outPath = `${OUT_DIR}/${item.id}.png`;
  await page.locator(".card").screenshot({ path: outPath });
  item.image = `docs/telegram-cards/${item.id}.png`;
  console.log("rendered", item.id);
}

await browser.close();
rmSync(SCRATCH, { recursive: true, force: true });
writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2) + "\n");
console.log(`\nWrote ${bank.items.length} PNGs to ${OUT_DIR} and updated the content bank with image paths.`);

#!/usr/bin/env node
/**
 * Renders a batch of "photo" style Telegram cards: an AI-generated
 * background image (via Pollinations.ai — public, no API key) with the same
 * branded text overlay as the plain cards, then appends the items to
 * docs/telegram-content-bank.json.
 *
 * Pollinations was chosen specifically because it needs no signup and no
 * key — nothing to configure on the server, nothing that can leak.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const BANK_PATH = `${REPO_ROOT}docs/telegram-content-bank.json`;
const OUT_DIR = `${REPO_ROOT}docs/telegram-cards`;
const TEMPLATE = readFileSync(new URL("./telegram-photo-card-template.html", import.meta.url), "utf8");

const GOLD = { fg: "#e0ad3c", border: "rgba(224,173,60,0.28)", bg: "rgba(224,173,60,0.07)" };

const NEW_ITEMS = [
  {
    id: "team-building-motivation",
    tag: "Referral",
    text: "The referral programme pays real USDT the moment your team claims, and the gold tiers stack on top of that — same volume, two rewards. You don't need permission to start building; the contract doesn't ask who referred you first before it counts.",
    prompt:
      "abstract network of glowing golden light nodes connecting across a dark navy background, cinematic, minimalist, financial technology, no text",
  },
  {
    id: "security-confidence",
    tag: "Security",
    text: "Read the code, not our word for it. Exact-match verified on Sourcify, no proxy, no upgradeable pattern, and the owner cannot touch a single dollar of staked principal. Confidence here isn't a marketing line — it's something you can check yourself in five minutes.",
    prompt:
      "glowing golden shield made of light particles floating on a dark background, digital security concept, cinematic lighting, no text",
  },
  {
    id: "yield-every-second",
    tag: "Staking",
    text: "Yield doesn't wait for you to check the app. It builds every second, against the stake the contract already recorded, whether you're watching or not. Check in once a week or once an hour — the number keeps moving either way.",
    prompt:
      "golden hourglass with flowing light particles inside, dark navy background, time and growth concept, cinematic, no text",
  },
  {
    id: "why-onchain-matters",
    tag: "Transparency",
    text: "Every stake, every claim, every fee — it's all sitting on Polygon where anyone can look. Not a dashboard we control, not a number we could quietly change. The chain doesn't take our word for it either.",
    prompt:
      "glowing blockchain network of connected golden and blue light nodes, dark background, abstract technology art, cinematic, no text",
  },
  {
    id: "small-start-motivation",
    tag: "Staking",
    text: "You don't need to arrive with a fortune. A modest, honest stake today is still a real position building real yield — the same contract, the same rates, the same rules as anyone depositing ten times more.",
    prompt:
      "a small golden seed glowing and growing into a tree made of light, dark background, growth concept, cinematic, no text",
  },
  {
    id: "claim-whenever-motivation",
    tag: "Flexibility",
    text: "Claim today, claim next month, or let it build — the choice is entirely yours, and the contract has no opinion about it. There's no bonus for waiting and no penalty for claiming often. Take it on your own schedule.",
    prompt:
      "golden coins falling like light rain into cupped hands silhouette, dark background, abstract, cinematic, no text",
  },
  {
    id: "verify-dont-trust-motivation",
    tag: "Transparency",
    text: "Don't take a screenshot's word for a live number. Every figure on this channel and on the site traces back to the same contract call anyone can run themselves — read-only, no login, no permission needed. Check it, then decide.",
    prompt:
      "a magnifying glass over glowing golden blockchain code on a dark background, verification concept, cinematic, no text",
  },
  {
    id: "building-in-the-open",
    tag: "Community",
    text: "Questions get real answers here, not a support ticket that disappears into a queue. If something about the contract, the rates, or the security model doesn't add up to you, ask — that's exactly what this channel is for.",
    prompt:
      "a glowing golden network of connected speech-bubble shapes made of light, dark background, community and conversation concept, cinematic, no text",
  },
];

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bodySizeFor(len) {
  if (len < 220) return 32;
  if (len < 300) return 28;
  return 25;
}

async function fetchImage(prompt, outPath) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=675&nologo=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pollinations responded ${res.status} for prompt: ${prompt}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
}

const SCRATCH = `${tmpdir()}/telegram-photo-card-render-${Date.now()}`;
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 })).newPage();

const bank = JSON.parse(readFileSync(BANK_PATH, "utf8"));
const rendered = [];

for (const item of NEW_ITEMS) {
  console.log("fetching background for", item.id);
  const bgPath = `${SCRATCH}/${item.id}-bg.jpg`;
  await fetchImage(item.prompt, bgPath);

  const html = TEMPLATE.replace("BG_IMAGE_PATH", `file://${bgPath}`)
    .replace("CHIP_COLOR", GOLD.fg)
    .replace("CHIP_BORDER", GOLD.border)
    .replace("CHIP_BG", GOLD.bg)
    .replace("CHIP_LABEL", item.tag)
    .replace("BODY_SIZE", String(bodySizeFor(item.text.length)))
    .replace("BODY_TEXT", escapeHtml(item.text).replace(/\n/g, "<br>"));

  const tmpHtml = `${SCRATCH}/${item.id}.html`;
  writeFileSync(tmpHtml, html);
  await page.goto(`file://${tmpHtml}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const outPath = `${OUT_DIR}/${item.id}.png`;
  await page.locator(".card").screenshot({ path: outPath });
  console.log("rendered", item.id);

  rendered.push({
    id: item.id,
    postedAt: null,
    text: `${item.text}\n\n#ArbiSmart #Polygon #USDT #${item.tag}`,
    image: `docs/telegram-cards/${item.id}.png`,
  });
}

await browser.close();

// Insert ahead of the current unposted backlog, same as the manual insert
// done earlier this session, so the fresh motivational batch surfaces first.
const insertAt = bank.items.findIndex((i) => i.postedAt === null);
bank.items.splice(insertAt === -1 ? bank.items.length : insertAt, 0, ...rendered);
writeFileSync(BANK_PATH, JSON.stringify(bank, null, 2) + "\n");

console.log(`\nWrote ${rendered.length} new photo cards and inserted them into the content bank.`);

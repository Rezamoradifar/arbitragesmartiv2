#!/usr/bin/env node
/**
 * Unattended watcher: scan Polymarket, message Telegram only when there is
 * something worth acting on.
 *
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... node bot/watch.mjs
 *
 * Options come from the environment so nothing secret is ever written here:
 *
 *   TELEGRAM_BOT_TOKEN  required to send. Without it the run prints and exits.
 *   TELEGRAM_CHAT_ID    required. Your own chat, NOT the public channel — see
 *                       below.
 *   MIN_PROFIT          dollars, default 5
 *   LIMIT               markets per pass, default 400
 *   PROBE_SHARES        depth probed per side, default 500
 *   STATE_FILE          default ./.arb-watch-state.json
 *   HEARTBEAT_HOURS     say "still watching, nothing found" this often,
 *                       default 24. Set 0 to stay silent forever.
 *
 * SEND THIS TO YOURSELF, NOT TO THE CHANNEL.
 * An arbitrage posted publicly is an arbitrage somebody else takes. The point
 * of the alert is that you get there first.
 *
 * WHY IT IS USUALLY QUIET
 * The venue keeps complete sets pinned within one tick of a dollar, so the
 * honest expected output of this program is silence. It exists for the day
 * that changes — a listing glitch, a resolution scramble, a thin new market —
 * and to prove, every day, that the day has not come. An alerter that fires
 * constantly is one nobody reads by the second week.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { scan } from "./lib.mjs";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const MIN_PROFIT = Number(process.env.MIN_PROFIT ?? 5);
const LIMIT = Number(process.env.LIMIT ?? 400);
const PROBE_SHARES = Number(process.env.PROBE_SHARES ?? 500);
const STATE_FILE = process.env.STATE_FILE ?? ".arb-watch-state.json";
const HEARTBEAT_HOURS = Number(process.env.HEARTBEAT_HOURS ?? 24);

/** Do not re-alert the same opportunity unless it has grown by half again. */
const REPEAT_HOURS = 6;
const GROWTH_TO_REALERT = 1.5;

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { seen: {}, lastHeartbeat: 0 };
  }
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("could not write state:", e.message);
  }
}

async function tell(text) {
  if (!TOKEN || !CHAT) {
    console.log("[no telegram configured]\n" + text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) console.error("telegram:", res.status, (await res.text()).slice(0, 200));
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function format(hits) {
  const lines = [`<b>Polymarket — ${hits.length} opportunit${hits.length === 1 ? "y" : "ies"}</b>`, ""];
  for (const h of hits.slice(0, 8)) {
    lines.push(
      `<b>${h.side} $${h.profit.toFixed(2)}</b> · ${h.shares.toFixed(0)} sets` +
        (h.fees === 0 ? " · fee-free" : ` · $${h.fees.toFixed(2)} fees`),
    );
    lines.push(esc(h.market.question.slice(0, 90)));
    lines.push(
      `YES ${h.priceYes.toFixed(4)} + NO ${h.priceNo.toFixed(4)} = <b>${h.combined.toFixed(4)}</b>` +
        (h.market.negRisk ? " · neg-risk" : ""),
    );
    lines.push(`https://polymarket.com/event/${h.market.slug}`);
    lines.push("");
  }
  lines.push("<i>Prices move. Re-check the book before trading.</i>");
  return lines.join("\n");
}

export { format };

async function main() {
  const state = loadState();
  const now = Date.now();

  const result = await scan({ limit: LIMIT, probeShares: PROBE_SHARES });
  const hits = result.opportunities.filter((o) => o.profit >= MIN_PROFIT);

  // Drop anything already reported recently at a similar size, so a standing
  // mispricing does not send the same message every few minutes.
  const fresh = hits.filter((h) => {
    const key = `${h.market.conditionId}:${h.side}`;
    const prev = state.seen[key];
    if (!prev) return true;
    const staleEnough = now - prev.at > REPEAT_HOURS * 3_600_000;
    const muchBigger = h.profit > prev.profit * GROWTH_TO_REALERT;
    return staleEnough || muchBigger;
  });

  for (const h of fresh) {
    state.seen[`${h.market.conditionId}:${h.side}`] = { at: now, profit: h.profit };
  }

  // Forget entries nobody will compare against again.
  for (const [k, v] of Object.entries(state.seen)) {
    if (now - v.at > 7 * 24 * 3_600_000) delete state.seen[k];
  }

  const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);

  if (fresh.length) {
    await tell(format(fresh));
    console.log(`${stamp}  ${result.scanned} scanned, ${fresh.length} alerted`);
  } else if (HEARTBEAT_HOURS > 0 && now - (state.lastHeartbeat ?? 0) > HEARTBEAT_HOURS * 3_600_000) {
    await tell(
      `<b>Polymarket watcher</b>\n${result.scanned} markets checked, nothing above $${MIN_PROFIT}.\n` +
        `<i>Silence is the expected result — the book stays within a tick of $1.</i>`,
    );
    state.lastHeartbeat = now;
    console.log(`${stamp}  ${result.scanned} scanned, nothing (heartbeat sent)`);
  } else {
    console.log(`${stamp}  ${result.scanned} scanned, nothing`);
  }

  saveState(state);
}

// Only run when executed directly, so the formatting above can be exercised
// by a test without the test triggering a live scan.
const isDirect = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());

if (isDirect) main().catch(async (e) => {
  console.error("FAILED:", e.message);
  // A watcher that dies quietly is worse than no watcher: you would go on
  // believing it was looking.
  await tell(`<b>Polymarket watcher failed</b>\n<code>${esc(e.message).slice(0, 300)}</code>`).catch(() => {});
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Runs the read-only scanner and writes what it found where the site can
 * read it — nothing more.
 *
 *   node bot/publish-scan.mjs
 *   node bot/publish-scan.mjs --out ../frontend/public/arbitrage-status.json
 *
 * Meant to run on a timer (cron, systemd) on the server, separate from the
 * Next.js process. Next serves anything under frontend/public/ as a static
 * file with no rebuild, so writing here is enough for the site's next fetch
 * to see it — no restart, no redeploy.
 *
 * The output has no opinion in it. It is the same counters scan.mjs already
 * prints, in JSON, plus a timestamp. The site decides how to say "zero" —
 * this script's only job is to not be wrong about the number.
 */

import { writeFileSync } from "node:fs";
import { scan, ONCHAIN_COST } from "./lib.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const OUT = arg("out", new URL("../frontend/public/arbitrage-status.json", import.meta.url).pathname);
const MIN_PROFIT = Number(arg("min-profit", 0.5));
const LIMIT = Number(arg("limit", 400));
const PROBE_SHARES = Number(arg("size", 500));

/** Fisher-Yates, so the ticker is a fresh draw every run rather than always the same head of the list. */
function sample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const startedAt = Date.now();
const result = await scan({ limit: LIMIT, probeShares: PROBE_SHARES });
const opportunities = result.opportunities.filter((o) => o.profit >= MIN_PROFIT);

const payload = {
  scannedAt: new Date().toISOString(),
  scanDurationMs: Date.now() - startedAt,
  marketsScanned: result.scanned,
  marketsFeeFree: result.feeFree,
  minProfitThreshold: MIN_PROFIT,
  onchainCostAssumed: ONCHAIN_COST,
  opportunitiesFound: opportunities.length,
  // Never more than what actually cleared the threshold, and never a wallet
  // address or anything that would tell a reader which market to race into —
  // this file is public, served to every visitor, and an arbitrage named in
  // public is an arbitrage someone else takes before the next scan.
  topOpportunity: opportunities[0]
    ? { profit: Math.round(opportunities[0].profit * 100) / 100 }
    : null,
  // Titles only — the same list anyone browsing polymarket.com already sees,
  // no price or combined-cost data. Purely so the page can show that a real,
  // varied set of markets is what "400 scanned" actually means, without
  // repeating the never-publish-a-price rule above.
  sampleMarkets: sample(result.markets, 16)
    .map((m) => m.question)
    .filter(Boolean),
};

writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Wrote ${OUT}`);
console.log(JSON.stringify(payload, null, 2));

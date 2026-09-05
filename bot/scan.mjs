#!/usr/bin/env node
/**
 * Polymarket complete-set arbitrage scanner — one-off, read-only.
 *
 *   node bot/scan.mjs [--limit 400] [--size 500] [--min-profit 1] [--json]
 *
 * Every binary market has a YES and a NO token, and exactly one pays $1 at
 * resolution, so a complete set is worth exactly $1 whatever happens. Buying a
 * set for under $1, or minting one for $1 and selling it for more, is profit
 * with no exposure to the outcome. This finds both, priced against the depth
 * actually resting on the book and against each market's own fee schedule.
 *
 * It does not trade, hold keys, or sign anything. It cannot lose money.
 */

import { scan, ONCHAIN_COST } from "./lib.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const minProfit = Number(arg("min-profit", 1));
const limit = Number(arg("limit", 400));
const probeShares = Number(arg("size", 500));
const asJson = process.argv.includes("--json");

const result = await scan({
  limit,
  probeShares,
  onProgress: asJson ? undefined : (n, total) => process.stdout.write(`  scanned ${n}/${total}\r`),
});

const hits = result.opportunities.filter((o) => o.profit >= minProfit);

if (asJson) {
  console.log(JSON.stringify({ scanned: result.scanned, opportunities: hits }, null, 2));
} else {
  console.log(
    `\n${result.markets.length} markets accepting orders · ${result.feeFree} fee-free · ` +
      `probing ${probeShares} shares a side · SELL charged $${ONCHAIN_COST} on-chain\n`,
  );
  console.log(`Scanned ${result.scanned}. ${hits.length} opportunities above $${minProfit}.\n`);

  if (!hits.length) {
    console.log("Nothing, which is the ordinary result. These get taken in seconds by people");
    console.log("already sitting on the book. A scanner that always finds something is");
    console.log("measuring its own assumptions rather than the market.");
  }

  for (const h of hits.slice(0, 20)) {
    const feeNote = h.fees === 0 ? "fee-free" : `$${h.fees.toFixed(2)} fees`;
    console.log(`${h.side}  $${h.profit.toFixed(2)}  ·  ${h.shares.toFixed(0)} sets  ·  ${feeNote}`);
    console.log(`   ${h.market.question.slice(0, 86)}`);
    console.log(
      `   YES ${h.priceYes.toFixed(4)} + NO ${h.priceNo.toFixed(4)} = ${h.combined.toFixed(4)}` +
        (h.market.negRisk ? "   [neg-risk]" : ""),
    );
    console.log(`   https://polymarket.com/event/${h.market.slug}\n`);
  }
}

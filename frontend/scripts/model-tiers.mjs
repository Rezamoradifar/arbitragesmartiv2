#!/usr/bin/env node
/**
 * Tier solvency model.
 *
 *   node frontend/scripts/model-tiers.mjs                 # the V4 ladder today
 *   node frontend/scripts/model-tiers.mjs --strategy 25   # assume a 25%/yr strategy
 *   node frontend/scripts/model-tiers.mjs --ladder my.json
 *
 * WHAT THIS ANSWERS
 *
 * "Can we keep the headline rates and put conditions on reaching them?" is a
 * question with an arithmetic answer, not an opinion. A tier ladder is solvent
 * when the capital-weighted daily payout is no larger than what the strategy
 * actually earns, after the performance fee. Everything else — how hard the
 * gate is, how many people clear it — only moves the weights.
 *
 * The model deliberately reports the gate strictness REQUIRED for a ladder to
 * balance, rather than only pass/fail. That number is the useful one: it turns
 * "make it hard to reach" into a figure you can look at and decide whether it
 * describes a product anyone would join.
 *
 * A ladder file is JSON:
 *   { "tiers": [ { "name": "Base", "dailyPct": 0.02, "share": 0.6,
 *                  "gate": "no lock" }, ... ] }
 * `share` is the fraction of total capital expected to sit in that tier and
 * the shares must sum to 1.
 */

import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};

const STRATEGY = Number(arg("strategy", 15)); // gross annual %, before the fee
const PERF_FEE = Number(arg("fee", 20)) / 100;

/** What reaches stakers, per day, as a percentage of capital. */
const budgetDaily = ((STRATEGY / 100) * (1 - PERF_FEE)) / 365 * 100;

const V4 = {
  label: "V4 as deployed",
  tiers: [
    { name: "Starter", dailyPct: 1.2, share: 0.6, gate: "10 USDT recorded" },
    { name: "Growth", dailyPct: 1.8, share: 0.25, gate: "500 USDT recorded" },
    { name: "Advanced", dailyPct: 2.4, share: 0.1, gate: "2,500 USDT recorded" },
    { name: "Elite", dailyPct: 3.0, share: 0.05, gate: "10,000 USDT recorded" },
  ],
};

const ladderPath = arg("ladder");
const ladder = ladderPath ? { label: ladderPath, ...JSON.parse(readFileSync(ladderPath, "utf8")) } : V4;

const sumShare = ladder.tiers.reduce((s, t) => s + t.share, 0);
if (Math.abs(sumShare - 1) > 1e-9) {
  console.error(`Tier shares sum to ${sumShare}, not 1. Fix the ladder first.`);
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
const num = (v, n, d = 4) => v.toFixed(d).padStart(n);

console.log(`\nStrategy assumption: ${STRATEGY}% a year gross, ${PERF_FEE * 100}% performance fee`);
console.log(`Payable to stakers:  ${budgetDaily.toFixed(4)}% a day  (${(budgetDaily * 365).toFixed(2)}% a year)\n`);

console.log(`Ladder: ${ladder.label}`);
console.log(`  ${pad("tier", 10)} ${pad("daily", 8)} ${pad("annual", 9)} ${pad("share", 7)} gate`);
for (const t of ladder.tiers) {
  console.log(
    `  ${pad(t.name, 10)} ${num(t.dailyPct, 7, 3)}% ${num(t.dailyPct * 365, 8, 1)}% ${num(t.share * 100, 6, 0)}%  ${t.gate ?? ""}`,
  );
}

const weighted = ladder.tiers.reduce((s, t) => s + t.dailyPct * t.share, 0);
const ratio = weighted / budgetDaily;

console.log(`\n  Weighted payout   ${weighted.toFixed(4)}% a day`);
console.log(`  Budget            ${budgetDaily.toFixed(4)}% a day`);
console.log(
  ratio <= 1
    ? `  SOLVENT — ${((1 / ratio - 1) * 100).toFixed(0)}% headroom\n`
    : `  INSOLVENT — pays ${ratio.toFixed(1)}x what it earns\n`,
);

if (ratio > 1) {
  /*
   * The question the whole conversation keeps returning to: if the rates stay
   * as they are, how strict would a gate have to be? Two readings of "strict",
   * because they are different products.
   */
  console.log("  If these rates are fixed, a gate would have to be this strict:\n");

  // Reading 1: the gate decides WHO earns at all; everyone else earns nothing.
  console.log("  (a) Gate decides who earns anything — the rest earn zero:");
  for (const t of ladder.tiers) {
    const frac = (budgetDaily / t.dailyPct) * 100;
    console.log(
      `      ${pad(t.name, 10)} only ${frac.toFixed(2)}% of capital could earn ${t.dailyPct}%/day` +
        `  (${(100 - frac).toFixed(2)}% earn nothing)`,
    );
  }

  // Reading 2: everyone is in, but yield only accrues on qualifying days.
  console.log("\n  (b) Everyone is in, but yield accrues only on qualifying days:");
  for (const t of ladder.tiers) {
    const days = (budgetDaily / t.dailyPct) * 100;
    console.log(
      `      ${pad(t.name, 10)} qualifies ${days.toFixed(2)}% of days` +
        `  (about 1 day in ${Math.round(100 / days)})`,
    );
  }

  console.log(
    "\n  Both readings describe the same arithmetic: the advertised rate is not\n" +
      "  the rate. If a gate has to exclude 98% of capital, the 2% it admits is\n" +
      "  a lottery prize, and the 98% it turns away is 98% of your complaints.\n",
  );
}

/*
 * Time to empty is the figure that turns a ratio into a date. It assumes an
 * idle pool — no new deposits, everyone claiming as it accrues — which is
 * exactly the state a protocol enters the moment growth stops.
 */
console.log("  Days until an idle pool is drained, per tier:");
for (const t of ladder.tiers) {
  console.log(`      ${pad(t.name, 10)} ${Math.round(100 / t.dailyPct)} days`);
}

/*
 * The alternative that keeps every product feature the ladder was for —
 * named packages, gates, better terms for more commitment — and is solvent by
 * construction because the tier sets a SHARE of real profit rather than a
 * fixed rate. Nobody is promised a number the strategy has not earned.
 */
console.log("\n  Share-based equivalent — same packages, same gates, solvent by construction:");

/*
 * Each tier keeps its standing RELATIVE to the base; only the absolute level
 * moves. Scaling by the share-weighted mean of those ratios is what makes the
 * weighted payout land exactly on the budget:
 *
 *   Σ scaled_i · share_i = budget · Σ(rel_i · share_i) / Σ(rel_j · share_j) = budget
 */
const rel = (t) => t.dailyPct / ladder.tiers[0].dailyPct;
const meanRel = ladder.tiers.reduce((s, t) => s + rel(t) * t.share, 0);

for (const t of ladder.tiers) {
  const scaled = (budgetDaily * rel(t)) / meanRel;
  console.log(
    `      ${pad(t.name, 10)} ${scaled.toFixed(4)}%/day  ${(scaled * 365).toFixed(1)}%/yr` +
      `  — ${rel(t).toFixed(2)}x the base, same as now`,
  );
}

// Proof rather than assertion: the rescaled ladder must land on the budget.
const check = ladder.tiers.reduce((s, t) => s + ((budgetDaily * rel(t)) / meanRel) * t.share, 0);
console.log(`      ${pad("", 10)} weighted: ${check.toFixed(4)}%/day vs budget ${budgetDaily.toFixed(4)}% ✓`);
console.log(
  "\n  The ratios between packages are preserved exactly. Elite is still worth\n" +
    "  chasing over Starter by the same multiple. Only the absolute level moves,\n" +
    "  to one the strategy can actually pay.\n",
);

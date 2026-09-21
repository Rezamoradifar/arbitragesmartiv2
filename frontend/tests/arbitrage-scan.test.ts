import test from "node:test";
import assert from "node:assert/strict";
import { parseArbitrageScan, isFreshScan } from "../lib/arbitrage-scan";

const now = Date.parse("2026-09-21T03:00:00Z");
const report = {
  scannedAt: new Date(now).toISOString(),
  marketsScanned: 400,
  marketsFeeFree: 300,
  opportunitiesFound: 2,
  minProfitThreshold: 0.5,
  onchainCostAssumed: 0.1,
  topOpportunity: { profit: 1.2 },
};

test("accepts the publisher report and keeps the original observation timestamp", () => {
  assert.deepEqual(parseArbitrageScan(report, now), report);
});
test("distinguishes zero matches from a missing report", () => {
  assert.equal(
    parseArbitrageScan(
      { ...report, opportunitiesFound: 0, topOpportunity: null },
      now,
    ).opportunitiesFound,
    0,
  );
  assert.throws(() => parseArbitrageScan(null, now));
});
test("rejects inconsistent counts, future times and invented numeric profit strings", () => {
  for (const patch of [
    { marketsFeeFree: 401 },
    { opportunitiesFound: 401 },
    { marketsScanned: -1 },
    { scannedAt: new Date(now + 6000).toISOString() },
    { topOpportunity: { profit: "99.00" } },
    { topOpportunity: { profit: Infinity } },
    { topOpportunity: { profit: 0.1 } },
    { topOpportunity: null },
    { opportunitiesFound: 0 },
    { onchainCostAssumed: -1 },
  ])
    assert.throws(() => parseArbitrageScan({ ...report, ...patch }, now));
});
test("expires estimates after thirty minutes without discarding their original report", () => {
  const parsed = parseArbitrageScan(report, now);
  assert.equal(isFreshScan(parsed, now), true);
  assert.equal(isFreshScan(parsed, now + 30 * 60_000), true);
  assert.equal(isFreshScan(parsed, now + 30 * 60_000 + 1), false);
  assert.equal(isFreshScan(parsed, 0), false);
  assert.equal(isFreshScan(undefined, now), false);
});

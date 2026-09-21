import test from "node:test";
import assert from "node:assert/strict";
import { parseTradingBotReport, isFreshTradingBotReport } from "../lib/trading-bot-status";
const now = Date.parse("2026-09-21T12:00:00Z");
const valid = { updatedAt: new Date(now).toISOString(), lastRunAt: new Date(now).toISOString(), mode: "dry-run", walletAddress: `0x${"1".repeat(40)}`, lastDecision: "found", tradesExecuted: 0, realizedProfitUsd: -1.25 };
test("preserves actual zero counts and negative reported P&L", () => {
  const report = parseTradingBotReport(valid, now);
  assert.equal(report?.tradesExecuted, 0);
  assert.equal(report?.realizedProfitUsd, -1.25);
  assert.equal(isFreshTradingBotReport(report!, now), true);
});
test("rejects malformed or forged-future execution reports", () => {
  for (const patch of [ {mode: "running"}, {walletAddress: "javascript:alert(1)"}, {tradesExecuted: -1}, {tradesExecuted: 1.5}, {realizedProfitUsd: "10"}, {realizedProfitUsd: Infinity}, {updatedAt: "invalid"}, {updatedAt: new Date(now + 120_000).toISOString()}, {lastDecision: "unknown"} ]) {
    assert.equal(parseTradingBotReport({...valid, ...patch}, now), null);
  }
  for (const input of [null, [], {}, "error"]) assert.equal(parseTradingBotReport(input, now), null);
});
test("a newly published file cannot make an old bot run look fresh", () => {
  const report = parseTradingBotReport({...valid, lastRunAt: new Date(now - 31 * 60_000).toISOString()}, now)!;
  assert.equal(isFreshTradingBotReport(report, now), false);
  assert.equal(isFreshTradingBotReport(parseTradingBotReport(valid, now)!, now + 31 * 60_000), false);
  assert.equal(isFreshTradingBotReport(undefined, now), false);
});

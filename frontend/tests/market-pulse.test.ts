import test from "node:test";
import assert from "node:assert/strict";
import {
  compareQuotes,
  isFreshQuote,
  parseKucoin,
  parseOkx,
  type Quote,
} from "../lib/market-pulse";

const now = 1_800_000_000_000;
const buy: Quote = {
  asset: "BTC",
  venue: "OKX",
  bid: 99,
  ask: 100,
  last: 100,
  change24h: 1,
  timestamp: now,
};
const sell: Quote = { ...buy, venue: "KuCoin", bid: 101, ask: 102, last: 101 };

test("uses the actual ask to buy and bid to sell", () => {
  const [r] = compareQuotes([buy, sell], now, 10);
  assert.equal(r.buy.venue, "OKX");
  assert.equal(r.sell.venue, "KuCoin");
  assert.ok(Math.abs(r.grossPct - 1) < 1e-10);
  assert.ok(
    Math.abs(r.afterFeesPct - ((101 * 0.999) / (100 * 1.001) - 1) * 100) <
      1e-10,
  );
});
test("a positive gross spread may be negative after both fees", () => {
  const [r] = compareQuotes([buy, { ...sell, bid: 100.1 }], now, 10);
  assert.ok(r.grossPct > 0);
  assert.ok(r.afterFeesPct < 0);
});
test("never turns stale quotes into live opportunities", () => {
  assert.deepEqual(
    compareQuotes([buy, { ...sell, timestamp: now - 60_001 }], now),
    [],
  );
  assert.deepEqual(compareQuotes([buy, sell], now + 60_001), []);
});
test("rejects mismatched quote timestamps", () => {
  assert.deepEqual(
    compareQuotes([buy, { ...sell, timestamp: now - 15_001 }], now),
    [],
  );
});
test("rejects invalid, crossed, missing and future prices", () => {
  for (const q of [
    { ...buy, bid: 0 },
    { ...buy, ask: NaN },
    { ...buy, bid: 102 },
    { ...buy, last: Infinity },
    { ...buy, timestamp: now + 5_001 },
  ])
    assert.equal(isFreshQuote(q, now), false);
});
test("one venue or different assets cannot produce a comparison", () => {
  assert.deepEqual(compareQuotes([buy], now), []);
  assert.deepEqual(compareQuotes([buy, { ...sell, venue: "OKX" }], now), []);
  assert.deepEqual(compareQuotes([buy, { ...sell, asset: "ETH" }], now), []);
});
test("validates fee assumptions and permits an explicit zero", () => {
  for (const f of [-1, 101, NaN, Infinity])
    assert.deepEqual(compareQuotes([buy, sell], now, f), []);
  const [r] = compareQuotes([buy, sell], now, 0);
  assert.equal(r.grossPct, r.afterFeesPct);
});
test("keeps negative observations negative", () => {
  const [r] = compareQuotes([buy, { ...sell, bid: 99.5 }], now);
  assert.ok(r.grossPct < 0);
  assert.ok(r.afterFeesPct < 0);
});
test("normalizes OKX public tickers without inventing timestamps", () => {
  const [q] = parseOkx({
    code: "0",
    data: [
      {
        instId: "BTC-USDT",
        bidPx: "99",
        askPx: "100",
        last: "100",
        open24h: "80",
        ts: String(now),
      },
      { instId: "BTC-USDC", bidPx: "99" },
    ],
  });
  assert.equal(q.timestamp, now);
  assert.equal(q.change24h, 25);
  assert.equal(q.venue, "OKX");
  assert.deepEqual(parseOkx({ code: "500", data: [] }), []);
});
test("normalizes KuCoin buy/sell and snapshot time", () => {
  const [q] = parseKucoin({
    code: "200000",
    data: {
      time: now,
      ticker: [
        {
          symbol: "ETH-USDT",
          buy: "99",
          sell: "100",
          last: "99.5",
          changeRate: ".05",
        },
      ],
    },
  });
  assert.equal(q.bid, 99);
  assert.equal(q.ask, 100);
  assert.equal(q.change24h, 5);
  assert.equal(q.timestamp, now);
  assert.deepEqual(parseKucoin(null), []);
  assert.deepEqual(parseOkx(null), []);
});

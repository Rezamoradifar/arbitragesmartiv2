#!/usr/bin/env node
/**
 * Polymarket complete-set arbitrage scanner.
 *
 *   node bot/scan.mjs [--limit 400] [--size 500] [--min-profit 1] [--json]
 *
 * WHAT IT LOOKS FOR
 *
 * Every binary market has a YES token and a NO token, and exactly one of them
 * pays $1 at resolution. A complete set is therefore worth exactly $1 whatever
 * happens, which makes two trades arbitrage in the strict sense — a profit
 * with no exposure to the outcome:
 *
 *   BUY  — buy YES and NO together for under $1; the pair redeems for $1.
 *          Profit is fixed at purchase, but locked up until resolution.
 *   SELL — mint a set on-chain for exactly $1 and sell both legs for more.
 *          Settles immediately and holds nothing.
 *
 * FEES ARE THE WHOLE GAME
 *
 * Polymarket charges takers  fee = shares x rate x (p(1-p))^exponent,  read
 * per market from its own feeSchedule rather than assumed. That shape matters
 * more than the rate: the charge peaks at a 50/50 price and collapses towards
 * the extremes. On a two-legged set at even money a 4% rate costs about two
 * cents a set, which eats almost any edge; the same market at 5c/95c costs
 * about a fifth of a cent. So this strategy lives at the extremes and in the
 * markets Polymarket charges nothing on, and a scanner that models fees as a
 * flat percentage of notional will point you at exactly the wrong trades.
 *
 * Makers are never charged. Everything below prices the taker path, which is
 * the pessimistic one.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not trade, hold keys, or sign anything. It reads public order books
 * and sizes each opportunity by the depth actually resting on them — a wide
 * spread on forty dollars of depth is not a trade. Execution is deliberately a
 * separate program; this one cannot lose money.
 */

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

/** Gas for the on-chain split, charged against a SELL. Override as measured. */
const ONCHAIN_COST = Number(process.env.ONCHAIN_COST ?? 0.05);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/**
 * Taker fee for one leg, per the market's own schedule.
 *
 * feesEnabled false, or no schedule, means free — several categories are, and
 * those are the ones worth scanning hardest.
 */
function legFee(market, price, shares) {
  const fs = market.feeSchedule;
  if (!market.feesEnabled || !fs || !fs.rate) return 0;
  const rate = Number(fs.rate);
  const exponent = Number(fs.exponent ?? 1);
  return shares * rate * Math.pow(price * (1 - price), exponent);
}

/** Active, two-outcome markets that are accepting orders. */
async function fetchMarkets(limit) {
  const out = [];
  const pageSize = 100;
  for (let offset = 0; out.length < limit && offset < 3000; offset += pageSize) {
    const page = await getJson(
      `${GAMMA}/markets?closed=false&active=true&limit=${pageSize}&offset=${offset}`,
    );
    if (!page.length) break;
    for (const m of page) {
      if (!m.acceptingOrders || m.closed) continue;
      let ids;
      try {
        ids = JSON.parse(m.clobTokenIds ?? "[]");
      } catch {
        continue;
      }
      if (ids.length !== 2) continue;

      out.push({
        question: m.question ?? "",
        conditionId: m.conditionId,
        slug: m.slug,
        yes: ids[0],
        no: ids[1],
        liquidity: Number(m.liquidity ?? 0),
        // Neg-risk markets are included: a single market's YES/NO pair is
        // still a complete set of one binary condition and still redeems for
        // $1. Only the contract used to mint and redeem differs — the
        // NegRiskAdapter rather than the plain Conditional Tokens — so the
        // flag is carried through to whatever executes, not used to discard
        // the market. Excluding them throws away most of the venue.
        negRisk: Boolean(m.negRisk),
        feesEnabled: Boolean(m.feesEnabled),
        feeSchedule: m.feeSchedule ?? null,
        endDate: m.endDate,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

const book = (id) => getJson(`${CLOB}/book?token_id=${id}`);

/**
 * Walk one side of a book: how many shares are available up to `maxShares`,
 * and at what average price.
 *
 * Quoting the top level alone would report an edge that is mostly not there —
 * first levels are routinely a handful of shares. The average across the
 * levels a trade would actually consume is the price it would actually get.
 */
function walk(levels, maxShares, ascending) {
  const sorted = (levels ?? [])
    .map((l) => ({ price: Number(l.price), size: Number(l.size) }))
    .filter((l) => l.price > 0 && l.price < 1 && l.size > 0)
    .sort((a, b) => (ascending ? a.price - b.price : b.price - a.price));

  let shares = 0;
  let cost = 0;
  for (const lvl of sorted) {
    if (shares >= maxShares) break;
    const take = Math.min(lvl.size, maxShares - shares);
    shares += take;
    cost += take * lvl.price;
  }
  return shares === 0 ? null : { shares, avg: cost / shares };
}

/**
 * Both directions for one market, sized by whichever leg is thinner — a set
 * needs equal quantities of each, so the tradable size is the minimum.
 */
function evaluate(m, yesBook, noBook, probeShares) {
  const results = [];

  // --- BUY: pay both asks, redeem the pair for $1 at resolution ------------
  {
    const a = walk(yesBook.asks, probeShares, true);
    const b = walk(noBook.asks, probeShares, true);
    if (a && b) {
      const shares = Math.min(a.shares, b.shares);
      const y = walk(yesBook.asks, shares, true);
      const n = walk(noBook.asks, shares, true);
      const fees = legFee(m, y.avg, shares) + legFee(m, n.avg, shares);
      const profit = shares * (1 - (y.avg + n.avg)) - fees;
      if (profit > 0) {
        results.push({
          side: "BUY",
          shares,
          priceYes: y.avg,
          priceNo: n.avg,
          combined: y.avg + n.avg,
          fees,
          profit,
          note: "Buy both legs, redeem at resolution",
        });
      }
    }
  }

  // --- SELL: mint a set for $1 on-chain, hit both bids ---------------------
  {
    const a = walk(yesBook.bids, probeShares, false);
    const b = walk(noBook.bids, probeShares, false);
    if (a && b) {
      const shares = Math.min(a.shares, b.shares);
      const y = walk(yesBook.bids, shares, false);
      const n = walk(noBook.bids, shares, false);
      const fees = legFee(m, y.avg, shares) + legFee(m, n.avg, shares);
      const profit = shares * (y.avg + n.avg - 1) - fees - ONCHAIN_COST;
      if (profit > 0) {
        results.push({
          side: "SELL",
          shares,
          priceYes: y.avg,
          priceNo: n.avg,
          combined: y.avg + n.avg,
          fees,
          profit,
          note: m.negRisk
            ? "Split via NegRiskAdapter for $1, sell both legs"
            : "Split via Conditional Tokens for $1, sell both legs",
        });
      }
    }
  }

  return results.map((r) => ({ ...r, market: m }));
}

async function main() {
  const minProfit = Number(arg("min-profit", 1));
  const limit = Number(arg("limit", 400));
  const probeShares = Number(arg("size", 500));
  const asJson = process.argv.includes("--json");

  const markets = await fetchMarkets(limit);
  const free = markets.filter((m) => !m.feesEnabled || !m.feeSchedule?.rate).length;

  if (!asJson) {
    console.log(`${markets.length} markets accepting orders · ${free} of them fee-free`);
    console.log(`Probing ${probeShares} shares a side, on-chain cost for a SELL $${ONCHAIN_COST}\n`);
  }

  const found = [];
  let scanned = 0;
  const CONCURRENCY = 10;

  for (let i = 0; i < markets.length; i += CONCURRENCY) {
    const batch = markets.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (m) => {
        const [yesBook, noBook] = await Promise.all([book(m.yes), book(m.no)]);
        return evaluate(m, yesBook, noBook, probeShares);
      }),
    );
    for (const s of settled) {
      scanned++;
      if (s.status === "fulfilled") found.push(...s.value);
    }
    if (!asJson) process.stdout.write(`  scanned ${scanned}/${markets.length}\r`);
  }

  const hits = found.filter((f) => f.profit >= minProfit).sort((a, b) => b.profit - a.profit);

  if (asJson) {
    console.log(JSON.stringify({ scanned, opportunities: hits }, null, 2));
    return;
  }

  console.log(`\n\nScanned ${scanned} markets. ${hits.length} opportunities above $${minProfit}.\n`);

  if (!hits.length) {
    console.log("Nothing, which is the ordinary result. These get taken in seconds by people");
    console.log("already sitting on the book. A scanner that always finds something is");
    console.log("measuring its own assumptions rather than the market.");
    return;
  }

  for (const h of hits.slice(0, 20)) {
    const feeNote = h.fees === 0 ? "fee-free" : `$${h.fees.toFixed(2)} fees`;
    console.log(`${h.side}  $${h.profit.toFixed(2)}  ·  ${h.shares.toFixed(0)} sets  ·  ${feeNote}`);
    console.log(`   ${h.market.question.slice(0, 86)}`);
    console.log(
      `   YES ${h.priceYes.toFixed(4)} + NO ${h.priceNo.toFixed(4)} = ${h.combined.toFixed(4)}` +
        (h.market.negRisk ? "   [neg-risk]" : ""),
    );
    console.log(`   ${h.note}`);
    console.log(`   https://polymarket.com/event/${h.market.slug}\n`);
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});

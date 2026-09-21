/**
 * Shared scanning core.
 *
 * Both the one-off scanner and the watcher import this, so there is one
 * definition of what an opportunity is. Two copies of this arithmetic would
 * drift, and the version that drifts is the one running unattended on a timer.
 */

export const GAMMA = "https://gamma-api.polymarket.com";
export const CLOB = "https://clob.polymarket.com";

/** Gas for the on-chain split, charged against a SELL. Override as measured. */
export const ONCHAIN_COST = Number(process.env.ONCHAIN_COST ?? 0.05);

export async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/**
 * Taker fee for one leg, per the market's own schedule.
 *
 * Polymarket charges  shares x rate x (p(1-p))^exponent,  not a flat share of
 * notional. The shape matters more than the rate: the charge peaks at even
 * money and collapses towards the extremes, so a two-legged set at 50/50 under
 * a 4% schedule costs about two cents while the same set at 5c/95c costs about
 * a fifth of one. Modelling this as a percentage would rank trades in close to
 * the wrong order.
 *
 * Makers are never charged. This prices the taker path, the pessimistic one.
 */
export function legFee(market, price, shares) {
  const fs = market.feeSchedule;
  if (!market.feesEnabled || !fs || !fs.rate) return 0;
  const rate = Number(fs.rate);
  const exponent = Number(fs.exponent ?? 1);
  return shares * rate * Math.pow(price * (1 - price), exponent);
}

/** Active, two-outcome markets that are accepting orders. */
export async function fetchMarkets(limit) {
  const out = [];
  const pageSize = 100;
  for (let offset = 0; out.length < limit && offset < 3000; offset += pageSize) {
    const page = await getJson(`${GAMMA}/markets?closed=false&active=true&limit=${pageSize}&offset=${offset}`);
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
        // Neg-risk markets are kept. A single market's YES/NO pair is still a
        // complete set of one binary condition and still redeems for a dollar;
        // only the contract that mints and redeems differs. They are ~92% of
        // the venue, so dropping them was the difference between scanning 8
        // markets and scanning 100.
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

export const book = (id) => getJson(`${CLOB}/book?token_id=${id}`);

/**
 * Walk one side of a book: shares available up to `maxShares`, and the average
 * price they would actually cost.
 *
 * Quoting the top level alone reports an edge that is mostly not there — first
 * levels are routinely a handful of shares.
 */
export function walk(levels, maxShares, ascending) {
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
export function evaluate(m, yesBook, noBook, probeShares) {
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

/** Scan `limit` markets and return every opportunity found, best first. */
export async function scan({ limit = 400, probeShares = 500, concurrency = 10, onProgress } = {}) {
  const markets = await fetchMarkets(limit);
  const found = [];
  let scanned = 0;

  for (let i = 0; i < markets.length; i += concurrency) {
    const batch = markets.slice(i, i + concurrency);
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
    onProgress?.(scanned, markets.length);
  }

  return {
    markets,
    scanned,
    feeFree: markets.filter((m) => !m.feesEnabled || !m.feeSchedule?.rate).length,
    opportunities: found.sort((a, b) => b.profit - a.profit),
  };
}

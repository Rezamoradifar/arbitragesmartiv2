"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  ASSETS,
  compareQuotes,
  isFreshQuote,
  type MarketPulse,
} from "@/lib/market-pulse";

const names: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
  DOGE: "Dogecoin",
  LINK: "Chainlink",
};
const price = (n?: number) =>
  n === undefined
    ? "—"
    : n.toLocaleString("en-US", {
        minimumFractionDigits: n < 1 ? 4 : 2,
        maximumFractionDigits: n < 1 ? 5 : 2,
      });
const percent = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(3)}%`;

export function MarketTerminal() {
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState("All markets");
  const [fee, setFee] = useState("10");
  const [search, setSearch] = useState("");
  const query = useQuery<MarketPulse>({
    queryKey: ["market-pulse"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/market-pulse", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("Market feed unavailable");
      return response.json();
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const quotes = query.data?.quotes.filter((q) => isFreshQuote(q, now)) ?? [];
  const feeValue = fee.trim() === "" ? NaN : Number(fee);
  const feeValid =
    Number.isFinite(feeValue) && feeValue >= 0 && feeValue <= 100;
  const spreads = compareQuotes(quotes, now, feeValue);
  const live = quotes.length > 0;
  const complete =
    quotes.some((q) => q.venue === "OKX") &&
    quotes.some((q) => q.venue === "KuCoin");
  const updated = quotes.length
    ? Math.min(...quotes.map((q) => q.timestamp))
    : null;
  const rows = ASSETS.filter((asset) =>
    `${asset} ${names[asset]}`.toLowerCase().includes(search.toLowerCase()),
  ).filter(
    (asset) =>
      filter !== "Positive after fees" ||
      spreads.some((s) => s.asset === asset && s.afterFeesPct > 0),
  );
  const best = [...spreads].sort((a, b) => b.afterFeesPct - a.afterFeesPct)[0];
  const hero = best ?? spreads[0];

  return (
    <>
      <div className="market-tape" aria-label="Market price ticker">
        <div className="container-page market-tape-inner">
          <span className="tape-label">
            <span className={`status-dot ${live ? "online" : ""}`} /> MARKET
            PULSE
          </span>
          {ASSETS.slice(0, 4).map((asset) => {
            const q = quotes.find((x) => x.asset === asset);
            return (
              <div className="tape-quote" key={asset}>
                <strong>
                  {asset}
                  <span>/USDT</span>
                </strong>
                <b>{price(q?.last)}</b>
                <span
                  className={
                    q?.change24h != null && q.change24h >= 0
                      ? "market-positive"
                      : "text-graphite-300"
                  }
                >
                  {q?.change24h != null
                    ? `${q.change24h >= 0 ? "+" : ""}${q.change24h.toFixed(2)}%`
                    : "Awaiting feed"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <section className="container-page market-hero">
        <div className="market-hero-copy">
          <div className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> THE MARKET
            DOESN&apos;T STAND STILL.
          </div>
          <h1>
            See the market.
            <br />
            <span className="text-gold-gradient">Find your edge.</span>
          </h1>
          <p>
            One clear view of exchange spreads, prediction markets and on-chain
            capital. Real sources. Every update in the open.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <a href="#live-markets" className="btn-primary">
              Explore live markets{" "}
              <Icon name="arrowUp" className="h-4 w-4 rotate-45" />
            </a>
            <Link href="/dashboard" className="btn-secondary">
              Open dashboard
            </Link>
          </div>
          <div className="hero-footnotes">
            <span>
              <Icon name="globe" className="h-3.5 w-3.5" /> Public market
              sources
            </span>
            <span>
              <Icon name="lock" className="h-3.5 w-3.5" /> No wallet needed to
              explore
            </span>
          </div>
        </div>

        <div className="market-preview glass">
          <div className="preview-heading">
            <span>
              <Icon name="activity" className="h-4 w-4 text-gold-300" /> SPREAD
              MONITOR
            </span>
            <span className={`feed-pill ${complete ? "is-live" : ""}`}>
              <span className={`status-dot ${complete ? "online" : ""}`} />
              {query.isLoading
                ? "Connecting"
                : complete
                  ? "Live quotes"
                  : live
                    ? "Partial feed"
                    : "Awaiting feed"}
            </span>
          </div>
          <div className="preview-pair">
            <span className="preview-symbol">
              {hero?.asset ?? "BTC"}
              <span> / USDT</span>
            </span>
            <span className="text-xs text-graphite-400">
              Cross-exchange · Spot
            </span>
          </div>
          <div className="preview-venues">
            <div>
              <span className="venue-side">BUY / ASK</span>
              <h3>{hero?.buy.venue ?? "OKX"}</h3>
              <strong>{price(hero?.buy.ask)}</strong>
              <small>USDT</small>
            </div>
            <Icon name="arrowUp" className="h-5 w-5 rotate-90 text-gold-400" />
            <div>
              <span className="venue-side">SELL / BID</span>
              <h3>{hero?.sell.venue ?? "KuCoin"}</h3>
              <strong>{price(hero?.sell.bid)}</strong>
              <small>USDT</small>
            </div>
          </div>
          <div className="preview-result">
            <div>
              <span>Indicative spread after fees</span>
              <strong
                className={
                  hero && hero.afterFeesPct > 0
                    ? "market-positive"
                    : "text-graphite-100"
                }
              >
                {hero ? percent(hero.afterFeesPct) : "—"}
              </strong>
            </div>
            <span className="result-note">
              {hero
                ? hero.afterFeesPct > 0
                  ? "Positive at top of book"
                  : "No positive edge on this route"
                : "Waiting for comparable quotes"}
            </span>
          </div>
          <p className="preview-disclaimer">
            {feeValid
              ? `${feeValue} bps per leg assumed.`
              : "Set a valid fee below."}{" "}
            Excludes transfers, slippage and order-book depth. Quotes do not
            represent executed trades.
          </p>
          <div className="preview-sources">
            <span className={`status-dot ${live ? "online" : ""}`} />
            {updated
              ? `Exchange quotes updated ${Math.max(0, Math.floor((now - updated) / 1000))}s ago`
              : "Connecting to public exchange data"}
            <span>15s refresh</span>
          </div>
        </div>
      </section>

      <section className="container-page pb-16 scroll-mt-28" id="live-markets">
        <div className="section-label">
          <span>01 / MARKET INTELLIGENCE</span>
          <span>OKX + KUCOIN</span>
        </div>
        <div className="market-section-heading">
          <div>
            <h2>Every spread. In perspective.</h2>
            <p>
              Compare both sides of the order book before looking at the
              opportunity.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary !px-4 !py-2.5"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <Icon
              name="swap"
              className={`h-4 w-4 ${query.isFetching ? "animate-pulse" : ""}`}
            />
            {query.isFetching ? "Refreshing" : "Refresh prices"}
          </button>
        </div>
        <div className="market-terminal glass overflow-hidden">
          <div className="market-toolbar">
            <div
              className="market-tabs"
              role="group"
              aria-label="Market filter"
            >
              {["All markets", "Positive after fees"].map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                  className={filter === item ? "selected" : ""}
                >
                  {item}
                  {item === "All markets" && <span>{ASSETS.length}</span>}
                </button>
              ))}
            </div>
            <div className="market-inputs">
              <label className="fee-input">
                Fee / leg{" "}
                <input
                  aria-label="Assumed fee per leg in basis points"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  aria-invalid={!feeValid}
                />
                <span>bps</span>
              </label>
              <input
                type="search"
                aria-label="Search markets"
                placeholder="Search markets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="market-search"
              />
            </div>
          </div>
          {!feeValid && (
            <p role="alert" className="px-6 py-3 text-sm text-amber-400">
              Enter a fee between 0 and 100 basis points per leg.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="spread-table">
              <caption className="sr-only">
                USDT market spreads from public exchange bid and ask prices
              </caption>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Buy venue / ask</th>
                  <th>Sell venue / bid</th>
                  <th>Gross spread</th>
                  <th>After assumed fees</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((asset) => {
                  const r = spreads.find((s) => s.asset === asset);
                  const waiting = query.isLoading;
                  return (
                    <tr key={asset}>
                      <td>
                        <div className="asset-title">
                          <span
                            className={`asset-monogram asset-${asset.toLowerCase()}`}
                          >
                            {asset.slice(0, 1)}
                          </span>
                          <div>
                            <strong>
                              {asset}
                              <span> / USDT</span>
                            </strong>
                            <small>{names[asset]}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{r?.buy.venue ?? "—"}</strong>
                        <small>{price(r?.buy.ask)}</small>
                      </td>
                      <td>
                        <strong>{r?.sell.venue ?? "—"}</strong>
                        <small>{price(r?.sell.bid)}</small>
                      </td>
                      <td
                        className={
                          r && r.grossPct > 0
                            ? "market-positive"
                            : "text-graphite-300"
                        }
                      >
                        {r ? percent(r.grossPct) : "—"}
                      </td>
                      <td
                        className={
                          r && r.afterFeesPct > 0
                            ? "market-positive"
                            : "text-graphite-300"
                        }
                      >
                        {r ? percent(r.afterFeesPct) : "—"}
                      </td>
                      <td>
                        <span
                          className={`signal-pill ${r && r.afterFeesPct > 0 ? "positive" : ""}`}
                        >
                          {r
                            ? r.afterFeesPct > 0
                              ? "Indicative edge"
                              : "Watching"
                            : waiting
                              ? "Connecting"
                              : "Unavailable"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="!py-10 !text-center text-graphite-300"
                    >
                      {search
                        ? "No markets match your search."
                        : live
                          ? "No positive spread after the selected fees right now."
                          : "No fresh, comparable quotes available. Try refreshing prices."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="terminal-footer">
            <span>
              <span className={`status-dot ${complete ? "online" : ""}`} />
              {complete
                ? "Both sources connected"
                : live
                  ? "One source available · comparison waiting"
                  : query.isLoading
                    ? "Connecting to market sources"
                    : "Market sources currently unavailable"}
            </span>
            <span>
              USDT pairs · {feeValid ? `${feeValue} bps / leg` : "Fee required"}{" "}
              · Refreshes every 15s
            </span>
          </div>
        </div>
        <p className="market-footnote">
          These are public market observations, separate from ArbiSmart&apos;s
          positions and realized returns. A positive indication is not an
          executable or guaranteed profit.{" "}
          <a
            href="https://www.okx.com/trade-spot/btc-usdt"
            target="_blank"
            rel="noreferrer"
          >
            OKX markets
          </a>{" "}
          ·{" "}
          <a
            href="https://www.kucoin.com/trade/BTC-USDT"
            target="_blank"
            rel="noreferrer"
          >
            KuCoin markets
          </a>
        </p>
      </section>
    </>
  );
}

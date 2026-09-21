"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PolymarketMarket } from "@/lib/polymarket";
import { Icon } from "@/components/Icon";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export function PolymarketMarkets() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const q = useQuery<{ markets: PolymarketMarket[]; fetchedAt: number | null }>(
    {
      queryKey: ["prediction-markets"],
      queryFn: async ({ signal }) => {
        const r = await fetch("/api/prediction-markets", {
          cache: "no-store",
          signal,
        });
        if (!r.ok) throw new Error("Prediction market feed unavailable");
        return r.json();
      },
      refetchInterval: 60_000,
      staleTime: 30_000,
      retry: 1,
    },
  );
  const markets = q.data?.markets ?? [];
  const stale = !!q.data?.fetchedAt && now - q.data.fetchedAt > 180_000;
  return (
    <section className="prediction-section">
      <div className="market-section-heading">
        <div>
          <h2>What the world is pricing in.</h2>
          <p>Active prediction markets, ranked by 24-hour volume.</p>
        </div>
        <span
          className={`feed-pill ${markets.length && !stale ? "is-live" : ""}`}
        >
          <span
            className={`status-dot ${markets.length && !stale ? "online" : ""}`}
          />
          {stale
            ? "Last known data"
            : markets.length
              ? "Polymarket feed"
              : q.isLoading
                ? "Connecting"
                : "Feed unavailable"}
        </span>
      </div>
      {markets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m, i) => (
            <a
              key={m.slug || m.question}
              href={
                m.slug
                  ? `https://polymarket.com/event/${encodeURIComponent(m.slug)}`
                  : "https://polymarket.com"
              }
              target="_blank"
              rel="noreferrer"
              className="prediction-card glass glass-hover"
            >
              <div className="prediction-card-top">
                <span>MARKET {String(i + 1).padStart(2, "0")}</span>
                <Icon name="external" className="h-3.5 w-3.5" />
              </div>
              <h3>{m.question}</h3>
              <div className="prediction-price">
                <div>
                  <span>{m.outcomeLabel}</span>
                  <strong>
                    {(m.yesPrice * 100).toFixed(1)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <span>24h volume</span>
                  <b>{usd(m.volume24hr)}</b>
                </div>
              </div>
              <div
                className="probability-track"
                role="meter"
                aria-label={`${m.outcomeLabel} implied probability`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={m.yesPrice * 100}
              >
                <div style={{ width: `${m.yesPrice * 100}%` }} />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="feed-empty glass">
          <Icon name="globe" className="h-7 w-7 text-gold-300" />
          <h3>
            {q.isLoading
              ? "Loading prediction markets"
              : "The market feed is temporarily unavailable"}
          </h3>
          <p>
            {q.isLoading
              ? "Requesting the latest public market snapshot."
              : "Prices will appear when the source reconnects. You can also view the source directly."}
          </p>
          <button
            type="button"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
            className="btn-secondary !py-2"
          >
            {q.isFetching ? "Connecting…" : "Retry connection"}
          </button>
        </div>
      )}
      <p className="market-footnote">
        <a href="https://polymarket.com" target="_blank" rel="noreferrer">
          Source: Polymarket Gamma API
        </a>{" "}
        · Refreshes every minute
        {q.data?.fetchedAt
          ? ` · Fetched ${Math.max(0, Math.floor((now - q.data.fetchedAt) / 60_000))}m ago`
          : ""}
        . Implied probabilities are market observations, not protocol positions
        or trading recommendations.
      </p>
    </section>
  );
}

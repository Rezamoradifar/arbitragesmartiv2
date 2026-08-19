"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { LiveDot } from "@/components/Aurora";

/**
 * What the scanner actually found, read from a file a cron job writes.
 *
 * bot/publish-scan.mjs runs bot/scan.mjs — read-only, no keys, cannot place
 * an order — against live Polymarket order books, and writes the count here.
 * This component only renders those numbers. It does not know what "good"
 * looks like and does not decide how to feel about zero; the copy below is
 * the only place that opinion lives, and it says the true thing: silence is
 * the ordinary reading, not a problem to explain away.
 *
 * Static JSON under /public rather than an API route because the number does
 * not need to be fresher than the cron interval, and a full pass takes real
 * time against 400 live order books — nothing a page load should be doing on
 * a visitor's behalf.
 *
 * The layout below (a percentage ring, a big headline number, a scrolling row
 * of markets) is deliberately closer to a live trading terminal than the flat
 * stat grid this replaced — but every number in it is still read straight
 * from the same file. `sampleMarkets` is titles only, never a price or
 * combined cost: the same list anyone browsing polymarket.com already sees,
 * not anything that would tell a reader which market to race into.
 */
type ScanStatus = {
  scannedAt: string;
  marketsScanned: number;
  marketsFeeFree: number;
  minProfitThreshold: number;
  opportunitiesFound: number;
  topOpportunity: { profit: number } | null;
  sampleMarkets?: string[];
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "moments ago";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  return `${Math.round(hr / 24)} days ago`;
}

export function ArbitrageScanner() {
  const [status, setStatus] = useState<ScanStatus | null | "unavailable">(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/arbitrage-status.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setStatus(d))
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "unavailable") return null;

  const stale = status !== null && Date.now() - new Date(status.scannedAt).getTime() > 6 * 60 * 60 * 1000;

  return (
    <div className="glass overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LiveDot />
          <h3 className="font-display text-lg font-semibold text-white">Watching Polymarket, live</h3>
        </div>
        {status && status !== null && (
          <Badge tone={stale ? "warn" : "neutral"}>
            {stale ? "Scan is stale — " : "Last scan "}
            {timeAgo(status.scannedAt)}
          </Badge>
        )}
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-graphite-300">
        A read-only scanner — no keys, cannot place an order — checks every active two-outcome
        market&apos;s order book for a complete set priced under a dollar, against real depth and each
        market&apos;s own fee schedule. It runs on a timer and this is its last pass, not a summary
        written after the fact.
      </p>

      {status === null ? (
        <div className="mt-6 h-56 animate-pulse rounded-xl bg-white/[.03]" />
      ) : (
        <>
          <div className="mt-7 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <FeeFreeGauge percent={status.marketsScanned ? (status.marketsFeeFree / status.marketsScanned) * 100 : 0} />

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-graphite-400">
                Opportunities above ${status.minProfitThreshold.toFixed(2)}
              </p>
              <p
                className={`font-display text-5xl font-bold tabular-nums leading-none sm:text-6xl ${
                  status.opportunitiesFound > 0 ? "text-volt-300" : "text-white"
                }`}
              >
                {status.opportunitiesFound}
              </p>
              {status.topOpportunity ? (
                <p className="mt-2 font-mono text-sm text-volt-300">
                  best found: ${status.topOpportunity.profit.toFixed(2)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-graphite-400">nothing cleared the threshold this pass</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="text-graphite-300">
                  <span className="font-display font-semibold text-white">{status.marketsScanned}</span> markets
                  checked
                </span>
                <span className="text-graphite-300">
                  <span className="font-display font-semibold text-white">{status.marketsFeeFree}</span> fee-free
                </span>
              </div>
            </div>
          </div>

          {!!status.sampleMarkets?.length && <MarketTicker items={status.sampleMarkets} />}

          <p className="mt-5 text-xs leading-relaxed text-graphite-500">
            {status.opportunitiesFound > 0 ? (
              <>
                Found, not yet taken — the contract cannot place an order on Polymarket&apos;s book
                without a permission it does not currently hold. See{" "}
                <Link href="/strategy" className="text-gold-400 underline underline-offset-2">
                  what the contract can and cannot do
                </Link>
                .
              </>
            ) : (
              <>
                Zero is the ordinary result. The book stays within a tick of a dollar because anyone
                sitting on it already takes what this would find, in seconds. This scan exists to
                keep proving that, and to catch the day it stops being true.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** Percentage ring, same construction as the dashboard's term-progress indicator. */
function FeeFreeGauge({ percent }: { percent: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * c;

  return (
    <div className="relative mx-auto h-[116px] w-[116px] shrink-0 sm:mx-0">
      <svg width="116" height="116" viewBox="0 0 116 116" className="-rotate-90">
        <defs>
          <linearGradient id="scannerRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4df9c" />
            <stop offset="50%" stopColor="#e0ad3c" />
            <stop offset="100%" stopColor="#b3741f" />
          </linearGradient>
        </defs>
        <circle cx="58" cy="58" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
        <circle
          cx="58"
          cy="58"
          r={r}
          fill="none"
          stroke="url(#scannerRing)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold tabular-nums text-white">{percent.toFixed(1)}%</span>
        <span className="mt-0.5 text-[10px] text-graphite-400">fee-free</span>
      </div>
    </div>
  );
}

/** Titles only, looping — see the file-level note on why prices never appear here. */
function MarketTicker({ items }: { items: string[] }) {
  // Rendered twice back to back so translateX(-50%) loops with no visible seam.
  const doubled = [...items, ...items];

  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-white/[.06] bg-black/20 py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-graphite-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-graphite-950 to-transparent" />
      <div className="flex w-max animate-marquee gap-3 motion-reduce:animate-none">
        {doubled.map((q, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/[.07] bg-white/[.03] px-3.5 py-1.5 text-xs text-graphite-300"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-graphite-500" />
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

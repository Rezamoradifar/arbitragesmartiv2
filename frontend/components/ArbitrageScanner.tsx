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
  sampleMarkets?: Array<{ question: string; feeFree: boolean }>;
};

/** The cron interval publish-scan.mjs is deployed with (deploy.sh). Used only
 *  to show an honest countdown to the next pass, never to imply this page
 *  itself is polling live. */
const SCAN_INTERVAL_MS = 20 * 60 * 1000;

function timeAgo(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "moments ago";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  return `${Math.round(hr / 24)} days ago`;
}

function countdown(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Ticks once a second — nothing here is re-fetched, only the clock reads
 *  are recomputed, so "next scan in 4:12" actually counts down instead of
 *  sitting frozen at whatever it read on page load. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function ArbitrageScanner() {
  const [status, setStatus] = useState<ScanStatus | null | "unavailable">(null);
  const now = useNow();

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

  const scannedMsAgo = status !== null ? now - new Date(status.scannedAt).getTime() : 0;
  const stale = status !== null && scannedMsAgo > 6 * 60 * 60 * 1000;
  const nextScanIn = SCAN_INTERVAL_MS - (scannedMsAgo % SCAN_INTERVAL_MS);

  return (
    <div className="glass overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LiveDot />
          <h3 className="font-display text-lg font-semibold text-white">Watching Polymarket, live</h3>
        </div>
        {status && status !== null && (
          <div className="flex items-center gap-2">
            <Badge tone={stale ? "warn" : "neutral"}>
              {stale ? "Scan is stale — " : "Last scan "}
              {timeAgo(scannedMsAgo)}
            </Badge>
            {!stale && (
              <Badge tone="brand">
                <span className="font-mono tabular-nums">{countdown(nextScanIn)}</span> to next scan
              </Badge>
            )}
          </div>
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

/** Percentage ring, same construction as the dashboard's term-progress indicator,
 *  plus a bright marker dot at the arc's leading edge — purely decorative,
 *  same real percentage as the number in the middle. */
function FeeFreeGauge({ percent }: { percent: number }) {
  const r = 46;
  const cx = 58;
  const cy = 58;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const dash = (clamped / 100) * c;

  // The ring is drawn rotated -90deg (start at 12 o'clock); the marker is
  // placed with plain trig in unrotated space, so its angle starts at the
  // same 12-o'clock reference: -90deg plus the swept fraction.
  const angle = (-90 + (clamped / 100) * 360) * (Math.PI / 180);
  const markerX = cx + r * Math.cos(angle);
  const markerY = cy + r * Math.sin(angle);

  return (
    <div className="relative mx-auto h-[116px] w-[116px] shrink-0 sm:mx-0">
      <svg width="116" height="116" viewBox="0 0 116 116">
        <defs>
          <linearGradient id="scannerRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4df9c" />
            <stop offset="50%" stopColor="#e0ad3c" />
            <stop offset="100%" stopColor="#b3741f" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#scannerRing)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-1000 ease-out"
        />
        {clamped > 0 && (
          <circle cx={markerX} cy={markerY} r="5" fill="#f4df9c" className="drop-shadow-[0_0_6px_rgba(224,173,60,.9)]" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold tabular-nums text-white">{percent.toFixed(1)}%</span>
        <span className="mt-0.5 text-[10px] text-graphite-400">fee-free</span>
      </div>
    </div>
  );
}

/** Titles + fee status, looping — see the file-level note on why prices never
 *  appear here. The dot colour is real per-market data (fee-free or not),
 *  not decoration standing in for something we didn't measure. */
function MarketTicker({ items }: { items: Array<{ question: string; feeFree: boolean }> }) {
  // Rendered twice back to back so translateX(-50%) loops with no visible seam.
  const doubled = [...items, ...items];

  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-white/[.06] bg-black/20 py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-graphite-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-graphite-950 to-transparent" />
      <div className="flex w-max animate-marquee gap-3 motion-reduce:animate-none">
        {doubled.map((m, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/[.07] bg-white/[.03] px-3.5 py-1.5 text-xs text-graphite-300"
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.feeFree ? "bg-success-400" : "bg-graphite-500"}`}
              title={m.feeFree ? "fee-free market" : "fees apply"}
            />
            {m.question}
          </span>
        ))}
      </div>
    </div>
  );
}

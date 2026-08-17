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
 */
type ScanStatus = {
  scannedAt: string;
  marketsScanned: number;
  marketsFeeFree: number;
  minProfitThreshold: number;
  opportunitiesFound: number;
  topOpportunity: { profit: number } | null;
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
    <div className="glass p-6 sm:p-8">
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
        <div className="mt-6 h-24 animate-pulse rounded-xl bg-white/[.03]" />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Markets checked</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
                {status.marketsScanned}
              </p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
              <p className="text-xs uppercase tracking-wide text-graphite-400">Fee-free among them</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
                {status.marketsFeeFree}
              </p>
            </div>
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
              <p className="text-xs uppercase tracking-wide text-graphite-400">
                Opportunities above ${status.minProfitThreshold.toFixed(2)}
              </p>
              <p
                className={`mt-1 font-display text-2xl font-bold tabular-nums ${
                  status.opportunitiesFound > 0 ? "text-volt-300" : "text-graphite-100"
                }`}
              >
                {status.opportunitiesFound}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-graphite-500">
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

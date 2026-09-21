"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import { LiveDot } from "@/components/Aurora";

/**
 * Read-only status for the separate-wallet execution bot (bot/execute.mjs).
 *
 * Deliberately read-only. There is no control here that can flip the bot
 * into live trading — that switch (DRY_RUN / LIVE_CONFIRM) only exists in
 * bot/.env on the server, set by hand. A web button wired to a real-money
 * trading trigger is a bigger attack surface than the convenience is worth;
 * this component only ever displays what already happened.
 *
 * Reads /trading-bot-status.json, written by the bot itself after each run
 * (same pattern as arbitrage-status.json for the read-only scanner). Absent
 * file — bot not wired up to publish yet, or genuinely never run — renders
 * nothing rather than a placeholder, same rule the scanner already follows.
 */
type BotStatus = {
  updatedAt: string;
  mode: "dry-run" | "live";
  walletAddress: string;
  lastRunAt: string;
  lastDecision: "no-opportunity" | "found" | "executed" | "skipped-stale";
  lastOpportunity: { side: "BUY" | "SELL"; market: string; expectedProfit: number } | null;
  tradesExecuted: number;
  realizedProfitUsd: number;
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

const DECISION_LABEL: Record<BotStatus["lastDecision"], string> = {
  "no-opportunity": "No opportunity above the profit threshold",
  found: "Found an opportunity",
  executed: "Executed a trade",
  "skipped-stale": "Opportunity was gone by execution time",
};

export function TradingBotStatus() {
  const [status, setStatus] = useState<BotStatus | null | "unavailable">(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/trading-bot-status.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setStatus(d))
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "unavailable" || status === null) return null;

  return (
    <div className="glass p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LiveDot />
          <h3 className="font-display text-lg font-semibold text-white">Execution bot — separate wallet</h3>
        </div>
        <Badge tone={status.mode === "live" ? "brand" : "neutral"}>
          {status.mode === "live" ? "Live" : "Dry run — no real orders"}
        </Badge>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-graphite-300">
        A small, separate trading wallet — not the ArbiSmart pool — testing whether Polymarket&apos;s
        own CLOB API can close the complete-set arbitrage the contract itself cannot reach (see above).
        Any realized profit sits in this wallet until it is deliberately deposited into the pool; it is
        never automatic.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Wallet</p>
          <p className="mt-1 break-all font-mono text-xs text-graphite-200">{status.walletAddress}</p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Last run</p>
          <p className="mt-1 text-sm text-graphite-200">{timeAgo(status.lastRunAt)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
        <p className="text-xs uppercase tracking-wide text-graphite-400">Last decision</p>
        <p className="mt-1 text-sm text-graphite-200">{DECISION_LABEL[status.lastDecision]}</p>
        {status.lastOpportunity && (
          <p className="mt-1.5 font-mono text-xs text-volt-300">
            {status.lastOpportunity.side} · {status.lastOpportunity.market} · expected $
            {status.lastOpportunity.expectedProfit.toFixed(2)}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span className="text-graphite-300">
          <span className="font-display font-semibold text-white">{status.tradesExecuted}</span> trades
          executed
        </span>
        <span className="text-graphite-300">
          <span className="font-display font-semibold text-white">${status.realizedProfitUsd.toFixed(2)}</span>{" "}
          realized in this wallet
        </span>
      </div>
    </div>
  );
}

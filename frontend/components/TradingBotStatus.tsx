"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { shortAddress } from "@/lib/contract";
import { parseTradingBotReport, isFreshTradingBotReport, type TradingBotReport } from "@/lib/trading-bot-status";

const decisions: Record<TradingBotReport["lastDecision"], string> = {
  "no-opportunity": "No opportunity reported",
  found: "Opportunity reported · not an executed trade",
  executed: "Execution reported by the bot",
  "skipped-stale": "Skipped · opportunity expired",
};

export function TradingBotStatus() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ["trading-bot-status"],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/trading-bot-status.json?t=${Date.now()}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("Bot report unavailable");
      const report = parseTradingBotReport(await response.json());
      if (!report) throw new Error("Invalid bot report");
      return report;
    },
    refetchInterval: 60_000, staleTime: 30_000, retry: false,
  });
  const report = query.data;
  const fresh = !query.isError && isFreshTradingBotReport(report, now);
  const age = report ? Math.max(0, Math.floor((now - Date.parse(report.lastRunAt)) / 60_000)) : null;
  return (
    <section className="glass p-6 sm:p-8" aria-label="Execution bot reporting">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow"><Icon name="activity" className="h-3.5 w-3.5" /> EXECUTION MONITOR</span>
          <h2 className="mt-3 font-display text-xl font-semibold">Polymarket bot connection</h2>
        </div>
        <span className="feed-pill"><span className="status-dot" />
          {query.isLoading ? "Checking reports" : !report ? "No verified connection" : fresh ? "Report received" : "Last known report"}
        </span>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-graphite-300">
        Orders require the separate trading wallet and Polymarket&apos;s order service.
        Pool contract functions alone do not place orders. This page reads the bot&apos;s
        published reports; it does not start trading or transfer pool funds.
      </p>
      <dl className="bot-status-grid">
        <div><dt>Reported execution mode</dt><dd>{report ? report.mode === "dry-run" ? "Simulation only" : "Configured for live orders" : "Unconfirmed"}</dd></div>
        <div><dt>Last reported run</dt><dd>{age === null ? "No report available" : `${age}m ago${fresh ? "" : " · stale / unconfirmed"}`}</dd></div>
        <div><dt>Pool profit settlement</dt><dd>Separate owner deposit</dd></div>
      </dl>
      {report ? (
        <div className="mt-5 border-t border-white/10 pt-5 text-sm text-graphite-300">
          <p>{decisions[report.lastDecision]}</p>
          <p className="mt-2">Bot-reported totals: {report.tradesExecuted} trades · ${report.realizedProfitUsd.toFixed(2)} P&amp;L.</p>
          <p className="mt-2 text-xs">These figures are not independently reconciled with fills, fees or wallet balances.</p>
          <a className="mt-3 inline-flex items-center gap-2 text-gold-300" href={`https://polygonscan.com/address/${report.walletAddress}`} target="_blank" rel="noreferrer">Trading wallet {shortAddress(report.walletAddress)} <Icon name="external" className="h-3 w-3" /></a>
        </div>
      ) : (
        <p className="mt-5 text-sm text-graphite-300">No valid execution report is available. Market prices and scanner observations do not confirm a running trading bot.</p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-graphite-400">Checks every minute · reports expire after 30 minutes</span>
        <button type="button" className="btn-secondary !py-2" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Checking…" : "Check connection"}</button>
      </div>
    </section>
  );
}

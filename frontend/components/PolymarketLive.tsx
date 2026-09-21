"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TradingBotStatus } from "./TradingBotStatus";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { useProtocol } from "@/lib/hooks";
import { useArbitrageScan } from "@/lib/use-arbitrage-scan";
import { isFreshScan } from "@/lib/arbitrage-scan";
import {
  CONTRACT_ADDRESS,
  EXPLORER,
  formatAmount,
  shortAddress,
} from "@/lib/contract";
import { ArbitrageScanner } from "./ArbitrageScanner";
import { PolymarketMarkets } from "./PolymarketMarkets";
import { Icon } from "./Icon";

const profitEvent = parseAbiItem(
  "event ArbitrageProfitAccrued(uint256 amount, uint256 totalProfit)",
);

export function PolymarketLive() {
  const p = useProtocol();
  const scan = useArbitrageScan();
  const client = usePublicClient();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  const freshScan = isFreshScan(scan.data, now);
  const contractFresh =
    p.arbitrageProfit !== undefined &&
    p.dataUpdatedAt > 0 &&
    now > 0 &&
    now - p.dataUpdatedAt <= 60_000 &&
    !p.isError;
  const events = useQuery({
    queryKey: ["profit-credit-events", CONTRACT_ADDRESS, client?.chain?.id],
    enabled: !!client,
    queryFn: async () => {
      if (!client) throw new Error("Contract reader unavailable");
      // Deliberately bounded: four 45-block ranges fit common public RPC limits.
      // A failed range makes the whole refresh unavailable, never a false zero.
      const latest = await client.getBlockNumber({ cacheTime: 0 });
      const from = latest >= 179n ? latest - 179n : 0n;
      const ranges: Array<{ from: bigint; to: bigint }> = [];
      for (let start = from; start <= latest; start += 45n) {
        ranges.push({
          from: start,
          to: start + 44n > latest ? latest : start + 44n,
        });
      }
      const batches = await Promise.all(
        ranges.map((r) =>
          client.getLogs({
            address: CONTRACT_ADDRESS,
            event: profitEvent,
            fromBlock: r.from,
            toBlock: r.to,
            strict: true,
          }),
        ),
      );
      const logs = batches
        .flat()
        .filter(
          (l) =>
            !l.removed &&
            l.transactionHash &&
            l.blockNumber !== null &&
            l.args.amount !== undefined &&
            l.args.totalProfit !== undefined,
        );
      logs.sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? (b.logIndex ?? 0) - (a.logIndex ?? 0)
          : a.blockNumber! < b.blockNumber!
            ? 1
            : -1,
      );
      return { from, latest, logs, fetchedAt: Date.now() };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const eventStale =
    !!events.data && (events.isError || now - events.data.fetchedAt > 90_000);
  const refreshing = scan.isFetching || events.isFetching;

  return (
    <div className="market-home container-page py-10 sm:py-16">
      <div className="section-label">
        <Link href="/">← HOME</Link>
        <span>POLYGON · PUBLIC DATA</span>
      </div>
      <div className="polymarket-page-heading">
        <div>
          <span className="eyebrow">
            <Icon name="activity" className="h-3.5 w-3.5" /> POLYMARKET LIVE
          </span>
          <h1>
            Markets in motion.
            <br />
            <span className="text-gold-gradient">Profit you can trace.</span>
          </h1>
          <p>
            Follow prediction markets, the latest scanner observations and the
            profit credits recorded by the protocol.
          </p>
        </div>
        <button
          className="btn-secondary"
          type="button"
          disabled={refreshing}
          onClick={() => {
            void scan.refetch();
            void events.refetch();
            void p.refetch();
          }}
        >
          <Icon name="swap" className="h-4 w-4" />
          {refreshing ? "Refreshing reports…" : "Refresh reports"}
        </button>
      </div>

      <section className="market-story">
        <div className="market-story-copy">
          <span className="eyebrow">GLOBAL EVENTS · ON-CHAIN MARKETS</span>
          <h2>A pulse on what happens next.</h2>
          <p>Explore public market probabilities and follow the trail from a scanner observation to a recorded profit credit. Every source has its own connection status.</p>
          <a href="#prediction-markets" className="btn-primary mt-6">Explore prediction markets <Icon name="arrowUp" className="h-4 w-4 rotate-45" /></a>
        </div>
        <div className="market-story-image"><Image src="/images/market-network.webp" alt="" fill sizes="(max-width: 800px) 100vw, 45vw" /></div>
      </section>
      <div className="profit-metrics">
        <article className="glass profit-metric profit-metric-lead">
          <span className="document-type">RECORDED POOL PROFIT CREDITS</span>
          <strong>
            {p.arbitrageProfit === undefined
              ? "—"
              : formatAmount(p.arbitrageProfit)}{" "}
            <small>USDT</small>
          </strong>
          <span className={`feed-pill ${contractFresh ? "is-live" : ""}`}>
            <span className={`status-dot ${contractFresh ? "online" : ""}`} />
            {p.arbitrageProfit === undefined
              ? p.isLoading
                ? "Reading contract"
                : "Contract unavailable"
              : contractFresh
                ? "Read from contract"
                : "Last known reading"}
          </span>
          <p>
            Cumulative contract credits, including external profit deposits.
            These do not prove Polymarket-only trading returns.
          </p>
        </article>
        <article className="glass profit-metric">
          <span className="document-type">BEST SCANNER ESTIMATE</span>
          <strong>
            {freshScan && scan.data?.topOpportunity
              ? `$${scan.data.topOpportunity.profit.toFixed(2)}`
              : "—"}
          </strong>
          <p>
            {freshScan
              ? scan.data?.opportunitiesFound
                ? "Estimated gain for the scanner’s probe size. No trade execution is implied."
                : "No opportunities met the threshold in the latest scan."
              : "A recent published scanner report is required."}
          </p>
        </article>
        <article className="glass profit-metric">
          <span className="document-type">MATCHES IN LATEST SCAN</span>
          <strong>{freshScan ? scan.data?.opportunitiesFound : "—"}</strong>
          <p>
            {freshScan
              ? `${scan.data?.marketsScanned.toLocaleString("en-US")} markets checked · threshold $${scan.data?.minProfitThreshold.toFixed(2)}`
              : "No fresh scanner reading"}
          </p>
        </article>
      </div>
      <p className="market-footnote">
        Contract values refresh every 15s; scanner reports are checked every
        minute and expire after 30 minutes. Scan estimates use the publisher’s
        order-book model
        {scan.data?.onchainCostAssumed !== undefined
          ? `, including $${scan.data.onchainCostAssumed.toFixed(2)} of assumed on-chain cost`
          : ""}
        . No deposit or trading action is available on this page.
      </p>

      <section className="mt-12" aria-labelledby="profit-events-title">
        <div className="market-section-heading">
          <div>
            <h2 id="profit-events-title">Recent profit credits</h2>
            <p>Public contract events with a transaction you can inspect.</p>
          </div>
          <Link href="/activity" className="scanner-link">
            All protocol activity{" "}
            <Icon name="external" className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="glass overflow-hidden">
          {events.data ? (
            <>
              <div className="profit-event-scope">
                {eventStale
                  ? "Last known event snapshot"
                  : "Queried block range"}{" "}
                · {events.data.from.toString()}–{events.data.latest.toString()}{" "}
                · Checked{" "}
                {Math.max(0, Math.floor((now - events.data.fetchedAt) / 1000))}s
                ago
              </div>
              {events.data.logs.length ? (
                <div className="overflow-x-auto">
                  <table className="market-table">
                    <caption className="sr-only">
                      Profit credit events in the queried Polygon block range
                    </caption>
                    <thead>
                      <tr>
                        <th>Block</th>
                        <th>Profit credited</th>
                        <th>Cumulative credits</th>
                        <th>Transaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.data.logs.map((log) => (
                        <tr key={`${log.transactionHash}-${log.logIndex}`}>
                          <td>{log.blockNumber!.toString()}</td>
                          <td>{formatAmount(log.args.amount)} USDT</td>
                          <td>{formatAmount(log.args.totalProfit)} USDT</td>
                          <td>
                            <a
                              className="text-gold-300 underline"
                              href={`${EXPLORER}/tx/${log.transactionHash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {shortAddress(log.transactionHash!)} ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="feed-empty">
                  <Icon name="activity" className="h-6 w-6 text-gold-300" />
                  <h3>No profit credits in this block range</h3>
                  <p>
                    This recent window is not the full trading history. New
                    confirmed credits will appear on the next successful
                    refresh.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="feed-empty">
              <Icon name="activity" className="h-6 w-6 text-gold-300" />
              <h3>
                {events.isLoading
                  ? "Reading recent profit events"
                  : "Profit event feed unavailable"}
              </h3>
              <p>
                {events.isLoading
                  ? "Checking the latest 180 Polygon blocks."
                  : "The public data source did not complete this request. No profit figure has been inferred."}
              </p>
            </div>
          )}
        </div>
        <p className="market-footnote">
          A profit-credit event can include externally deposited profit. It does
          not identify an individual Polymarket trade, its trading wallet or its
          market-level return.{" "}
          <Link href="/transparency">Check the reserve report</Link>.
        </p>
      </section>
      <div className="mt-12">
        <ArbitrageScanner />
      </div>
      <div className="mt-8">
        <TradingBotStatus />
      </div>
      <div className="mt-12 scroll-mt-28" id="prediction-markets">
        <PolymarketMarkets expanded />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Badge, Progress, Skeleton } from "@/components/ui";
import { LiveDot } from "@/components/Aurora";

function useSecondsSince(timestamp: number | undefined) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return undefined;
  return Math.max(0, Math.round((Date.now() - timestamp) / 1000));
}

export function LiveStats() {
  const p = useProtocol();
  const [lastUpdated, setLastUpdated] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!p.isLoading) setLastUpdated(Date.now());
  }, [p.isLoading, p.totalAssets, p.totalStaked, p.totalPaidOut]);
  const secondsAgo = useSecondsSince(lastUpdated);

  const deployed = p.arbitrageDeployed ?? 0n;
  const assets = p.totalAssets ?? 0n;
  const deployedPct = assets > 0n ? Number((deployed * 10000n) / assets) / 100 : 0;

  const items = [
    { label: "Total value locked", value: p.totalAssets, sub: "Liquid + deployed", lead: true },
    { label: "Principal staked", value: p.totalStaked, sub: "Across all active positions" },
    { label: "Paid out to stakers", value: p.totalPaidOut, sub: "Lifetime yield claimed" },
    { label: "Realized arbitrage profit", value: p.arbitrageProfit, sub: "Net of performance fee" },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow flex items-center gap-2">
            <LiveDot />
            Live
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Protocol at a glance
          </h2>
          {secondsAgo !== undefined && (
            <p className="mt-1.5 text-xs text-ink-400">
              Read straight from the contract · updated {secondsAgo}s ago
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.emergencyMode ? (
            <Badge tone="bad">Emergency mode</Badge>
          ) : p.paused ? (
            <Badge tone="warn">Paused</Badge>
          ) : (
            <Badge tone="good">Operating normally</Badge>
          )}
          {p.userCount !== undefined && (
            <Badge tone="neutral">{p.userCount.toString()} participants</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.label}
            className={`card card-hover ${
              it.lead ? "bg-gradient-to-br from-brand-900/30 to-ink-900/70" : ""
            }`}
          >
            <p className="text-sm text-ink-300">{it.label}</p>
            <p className="stat-value mt-2">
              {p.isLoading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <>
                  <span className={it.lead ? "text-gradient-brand" : ""}>
                    {formatAmount(it.value)}
                  </span>
                  <span className="ml-1.5 text-base font-medium text-ink-400">USDT</span>
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-ink-400">{it.sub}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-ink-200">Arbitrage capital deployed</p>
          <p className="text-sm tabular-nums text-ink-300">
            <span className="font-semibold text-white">{formatAmount(deployed)}</span>
            <span className="text-ink-400"> / {formatAmount(p.arbitrageCeiling)} USDT ceiling</span>
          </p>
        </div>
        <div className="mt-4">
          <Progress
            value={Number(deployed / 1_000000n)}
            max={Math.max(1, Number((p.arbitrageCeiling ?? 1n) / 1_000000n))}
            tone={deployedPct > 18 ? "warn" : "brand"}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          Capped cumulatively at 20% of total assets plus realized profit. The remaining{" "}
          <span className="text-ink-200">{formatAmount(p.balance)} USDT</span> stays liquid for
          withdrawals.
        </p>
      </div>
    </section>
  );
}

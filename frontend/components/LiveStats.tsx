"use client";

import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Badge, Progress, Skeleton } from "@/components/ui";

export function LiveStats() {
  const p = useProtocol();

  const deployed = p.arbitrageDeployed ?? 0n;
  const assets = p.totalAssets ?? 0n;
  const deployedPct = assets > 0n ? Number((deployed * 10000n) / assets) / 100 : 0;

  const items = [
    { label: "Total value locked", value: p.totalAssets, sub: "Liquid + deployed" },
    { label: "Principal staked", value: p.totalStaked, sub: "Across all active positions" },
    { label: "Paid out to stakers", value: p.totalPaidOut, sub: "Lifetime yield claimed" },
    { label: "Realized arbitrage profit", value: p.arbitrageProfit, sub: "Net of performance fee" },
  ];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Protocol at a glance</h2>
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
          <div key={it.label} className="card">
            <p className="text-sm text-slate-400">{it.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-50">
              {p.isLoading ? <Skeleton /> : `${formatAmount(it.value)} USDT`}
            </p>
            <p className="mt-1 text-xs text-slate-500">{it.sub}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-slate-300">Arbitrage capital deployed</p>
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-slate-100">{formatAmount(deployed)}</span> of{" "}
            {formatAmount(p.arbitrageCeiling)} USDT ceiling
          </p>
        </div>
        <div className="mt-3">
          <Progress
            value={Number(deployed / 1_000000n)}
            max={Math.max(1, Number((p.arbitrageCeiling ?? 1n) / 1_000000n))}
            tone={deployedPct > 18 ? "warn" : "brand"}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Capped cumulatively at 20% of total assets plus realized profit. The remaining{" "}
          {formatAmount(p.balance)} USDT stays liquid for withdrawals.
        </p>
      </div>
    </section>
  );
}

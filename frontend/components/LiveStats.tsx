"use client";

import { useEffect, useState } from "react";
import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Badge, Progress, StatCard } from "@/components/ui";
import { LiveDot } from "@/components/Aurora";
import { Icon } from "@/components/Icon";

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
    {
      label: "Total value locked",
      value: p.totalAssets,
      sub: "Liquid plus deployed, after unswept fees",
      lead: true,
      icon: "layers" as const,
    },
    {
      label: "Principal staked",
      value: p.totalStaked,
      sub: "Across all active positions",
      icon: "wallet" as const,
    },
    {
      label: "Paid out to stakers",
      value: p.totalPaidOut,
      sub: "Lifetime yield claimed",
      icon: "arrowDown" as const,
    },
    {
      label: "Realized strategy profit",
      value: p.arbitrageProfit,
      // Only profit actually received in collateral is ever counted here, so
      // this reads 0 until a position is genuinely closed at a gain. Say that
      // plainly rather than leaving a bare zero to be read as a fault.
      sub:
        (p.arbitrageProfit ?? 0n) === 0n
          ? "Nothing realised yet. Only settled gains count."
          : "After the performance fee, credited to the pool",
      icon: "zap" as const,
    },
  ];

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">
            <LiveDot />
            Live on-chain
          </span>
          <h2 className="h-section mt-4">Protocol at a glance</h2>
          {secondsAgo !== undefined && (
            <p className="mt-2 text-xs text-graphite-400">
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
          <StatCard
            key={it.label}
            label={it.label}
            lead={it.lead}
            loading={p.isLoading}
            icon={<Icon name={it.icon} className="h-5 w-5" />}
            value={
              <>
                {formatAmount(it.value)}
                <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
              </>
            }
            sub={it.sub}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StrategyCapacity
          deployed={deployed}
          ceiling={p.arbitrageCeiling}
          liquid={p.balance}
          deployedPct={deployedPct}
        />
        <BalanceSheet p={p} />
      </div>
    </section>
  );
}

/**
 * Strategy capacity. When nothing is deployed the honest reading is "no open
 * positions", not a bare zero — a lone 0 reads as broken rather than idle, and
 * the distinction matters to someone deciding whether to stake.
 */
function StrategyCapacity({
  deployed,
  ceiling,
  liquid,
  deployedPct,
}: {
  deployed: bigint;
  ceiling?: bigint;
  liquid?: bigint;
  deployedPct: number;
}) {
  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-graphite-100">Strategy capital deployed</p>
        <p className="text-sm tabular-nums text-graphite-300">
          {deployed === 0n ? (
            <Badge tone="neutral">No open positions</Badge>
          ) : (
            <>
              <span className="font-semibold text-white">{formatAmount(deployed)}</span>
              <span className="text-graphite-400"> / {formatAmount(ceiling)} USDT ceiling</span>
            </>
          )}
        </p>
      </div>
      <div className="mt-4">
        <Progress
          value={Number(deployed / 1_000000n)}
          max={Math.max(1, Number((ceiling ?? 1n) / 1_000000n))}
          tone={deployedPct > 18 ? "warn" : "volt"}
        />
      </div>
      <p className="mt-3.5 text-xs leading-relaxed text-graphite-400">
        {deployed === 0n ? (
          <>
            Every staked dollar is liquid right now, with nothing committed to a position. The
            contract can commit at most{" "}
            <span className="text-graphite-200">{formatAmount(ceiling)} USDT</span> (20% of assets);
            the rest can never leave the withdrawal buffer.
          </>
        ) : (
          <>
            Capped cumulatively at 20% of total assets plus realized profit. The remaining{" "}
            <span className="text-graphite-200">{formatAmount(liquid)} USDT</span> stays liquid for
            withdrawals.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The V3 balance sheet.
 *
 * Deposit fees are held in the same contract as pool capital, so the only way
 * "TVL" means anything is if the two are shown apart. `dashboard()` returns
 * both sides from one call, and `totalAssets()` already subtracts unswept fees
 * — this panel just makes that subtraction visible instead of implied.
 */
function BalanceSheet({ p }: { p: ReturnType<typeof useProtocol> }) {
  const rows: Array<{ label: string; value?: bigint; tone?: "gold" }> = [
    { label: "Gross deposits received", value: p.grossDeposits },
    { label: "Development & promotion fees", value: p.developmentFees, tone: "gold" },
    { label: "Recorded as user stakes", value: p.userNetStakes },
    { label: "Liquid in the main pool", value: p.mainPoolBalance },
    { label: "Deployed to strategy", value: p.deployedToArbitrage },
  ];

  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-graphite-100">Where the money sits</p>
        <Badge tone="brand">12–5% deposit fee</Badge>
      </div>

      <dl className="mt-4 space-y-0">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-4 border-b border-white/[.05] py-2.5 last:border-0"
          >
            <dt className="shrink-0 text-sm text-graphite-300">{r.label}</dt>
            <dd
              className={`min-w-0 break-words text-right text-sm font-medium tabular-nums ${
                r.tone === "gold" ? "text-gold-300" : "text-graphite-50"
              }`}
            >
              {formatAmount(r.value)} USDT
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3.5 text-xs leading-relaxed text-graphite-400">
        The deposit fee falls with size — 12% under 500 USDT, 5% from 10,000 — and the exact split
        is shown before you sign. Fees are counted separately and subtracted from total assets, so
        fee income never gets mistaken for pool capital or withdrawn as though it were.
      </p>
    </div>
  );
}

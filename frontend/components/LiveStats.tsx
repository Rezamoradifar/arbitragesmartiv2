"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Badge, StatCard } from "@/components/ui";
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

export function LiveStats({ detailed = false }: { detailed?: boolean }) {
  const p = useProtocol();
  const secondsAgo = useSecondsSince(p.dataUpdatedAt || undefined);

  // Missing RPC results must not become zero balances or an "operating
  // normally" badge. A query can settle with individual calls failing.
  if (
    p.totalAssets === undefined ||
    p.totalStaked === undefined ||
    p.balance === undefined ||
    p.arbitrageDeployed === undefined ||
    p.arbitrageProfit === undefined ||
    p.paused === undefined ||
    p.emergencyMode === undefined
  ) {
    return (
      <section>
        <h2 className="h-section">Protocol at a glance</h2>
        <div className="feed-empty glass mt-6">
          <Icon name="layers" className="h-7 w-7 text-gold-300" />
          <h3>
            {p.isLoading
              ? "Reading the Polygon contract"
              : "On-chain data is currently unavailable"}
          </h3>
          <p>
            {p.isLoading
              ? "Fetching balances, strategy capital and protocol status."
              : "Balances and operating status will appear after a successful contract read."}
          </p>
          <button
            type="button"
            onClick={() => p.refetch()}
            disabled={p.isLoading}
            className="btn-secondary !py-2"
          >
            {p.isLoading ? "Connecting…" : "Retry contract read"}
          </button>
        </div>
      </section>
    );
  }

  const deployed = p.arbitrageDeployed ?? 0n;
  const assets = p.totalAssets ?? 0n;
  const owed = p.totalStaked;
  const coverage = owed > 0n ? Number((assets * 10000n) / owed) / 100 : null;

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
      label: "Recorded profit credits",
      value: p.arbitrageProfit,
      sub:
        (p.arbitrageProfit ?? 0n) === 0n ? (
          <>
            No profit credits recorded.{" "}
            <Link
              href="/strategy"
              className="text-gold-300 underline underline-offset-2"
            >
              Why, and where the yield comes from
            </Link>
          </>
        ) : (
          "Contract total; includes externally deposited profit"
        ),
      icon: "zap" as const,
    },
  ];

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">
            <LiveDot />
            {secondsAgo !== undefined && secondsAgo > 60
              ? "Last known on-chain data"
              : "Live on-chain"}
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
            <Badge tone="neutral">Contract not paused</Badge>
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
                <span className="ml-1.5 text-base font-semibold text-graphite-400">
                  USDT
                </span>
              </>
            }
            sub={it.sub}
          />
        ))}
      </div>

      {detailed ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="glass p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Reserve report</h3>
            <p className="mt-2 text-xs text-graphite-300">
              Pool assets after unswept fees, compared with recorded principal.
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Net pool assets</dt>
                <dd>{formatAmount(assets)} USDT</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Recorded principal</dt>
                <dd>{formatAmount(owed)} USDT</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Asset coverage</dt>
                <dd>
                  {coverage === null
                    ? "Not applicable"
                    : `${coverage.toFixed(1)}%`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Reserve shortfall</dt>
                <dd>{formatAmount(owed > assets ? owed - assets : 0n)} USDT</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Strategy deployment</dt>
                <dd>{formatAmount(deployed)} USDT</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Deployment ceiling</dt>
                <dd>{formatAmount(p.arbitrageCeiling)} USDT</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-graphite-300">
              Coverage below 100% means current pool assets are less than
              recorded principal. Liquid balances do not guarantee that every
              withdrawal can be paid.
            </p>
          </div>
          <BalanceSheet p={p} />
        </div>
      ) : (
        <div className="reserve-summary glass">
          <span
            className={
              coverage !== null && coverage < 100
                ? "text-danger-400"
                : "text-graphite-200"
            }
          >
            Asset coverage:{" "}
            {coverage === null ? "Not applicable" : `${coverage.toFixed(1)}%`}
            {coverage !== null && coverage < 100
              ? " · Pool assets below recorded principal"
              : ""}
          </span>
          <Link href="/transparency">
            View reserve report <Icon name="external" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
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
    {
      label: "Development & promotion fees",
      value: p.developmentFees,
      tone: "gold",
    },
    { label: "Recorded as user stakes", value: p.userNetStakes },
    { label: "Liquid in the main pool", value: p.mainPoolBalance },
    { label: "Deployed to strategy", value: p.deployedToArbitrage },
  ];

  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-graphite-100">
          Where the money sits
        </p>
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
        The deposit fee falls with size — 12% under 500 USDT, 5% from 10,000 —
        and the exact split is shown before you sign. Fees are counted
        separately and subtracted from total assets, so fee income never gets
        mistaken for pool capital or withdrawn as though it were.
      </p>
    </div>
  );
}

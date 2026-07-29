"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EarningsChart, type Point } from "@/components/EarningsChart";
import { Alert, Badge, EmptyState, Progress, Section, Skeleton } from "@/components/ui";
import { useUserPosition, useProtocol } from "@/lib/hooks";
import { fetchLogsWithFallback } from "@/lib/logs";
import {
  CONTRACT_ABI,
  EXPLORER,
  PLANS,
  REFERRAL_LEVELS,
  formatAmount,
  formatBps,
} from "@/lib/contract";

type HistoryRow = {
  key: string;
  kind: string;
  amount: bigint;
  detail: string;
  block: bigint;
  time: number;
  hash: string;
};

const KIND_TONE: Record<string, "good" | "brand" | "warn" | "neutral"> = {
  Staked: "good",
  "Topped up": "good",
  Claimed: "brand",
  "Referral claimed": "brand",
  "Plan upgraded": "neutral",
  "Early exit": "warn",
  "Emergency withdrawal": "warn",
};

export default function PortfolioPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="py-24 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Portfolio</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-300">
          Connect your wallet to see your positions, earnings and full transaction history.
        </p>
        <div className="mt-8 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return <Portfolio />;
}

function Portfolio() {
  const user = useUserPosition();
  const protocol = useProtocol();
  const client = usePublicClient();

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!client || !user.address) return;
    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const { logs, reduced: isReduced } = await fetchLogsWithFallback(client, {});
      setReduced(isReduced);

      const { decodeEventLog } = await import("viem");
      const rows: HistoryRow[] = [];
      const blockTimes = new Map<bigint, number>();

      for (const raw of logs as Array<{
        data: `0x${string}`;
        topics: [];
        blockNumber: bigint;
        transactionHash: `0x${string}`;
        logIndex: number;
      }>) {
        let ev: { eventName: string; args: Record<string, unknown> };
        try {
          ev = decodeEventLog({
            abi: CONTRACT_ABI as never,
            data: raw.data,
            topics: raw.topics,
          }) as unknown as { eventName: string; args: Record<string, unknown> };
        } catch {
          continue;
        }

        const who = ev.args?.user;
        if (typeof who !== "string" || who.toLowerCase() !== user.address.toLowerCase()) continue;

        const map: Record<string, { kind: string; detail: string }> = {
          Staked: { kind: "Staked", detail: `Plan ${PLANS[Number(ev.args.plan ?? 0)]?.name ?? "—"}` },
          ToppedUp: { kind: "Topped up", detail: `New total ${formatAmount(ev.args.newTotal as bigint)}` },
          PlanUpgraded: {
            kind: "Plan upgraded",
            detail: `${PLANS[Number(ev.args.oldPlan ?? 0)]?.name} → ${PLANS[Number(ev.args.newPlan ?? 0)]?.name}`,
          },
          Claimed: { kind: "Claimed", detail: `Fee ${formatAmount(ev.args.fee as bigint)}` },
          ReferralClaimed: { kind: "Referral claimed", detail: "Referral rewards" },
          EarlyExited: { kind: "Early exit", detail: `Penalty ${formatAmount(ev.args.penalty as bigint)}` },
          EmergencyWithdrawn: { kind: "Emergency withdrawal", detail: "No penalty applied" },
        };

        const entry = map[ev.eventName];
        if (!entry) continue;

        rows.push({
          key: `${raw.transactionHash}-${raw.logIndex}`,
          kind: entry.kind,
          amount: (ev.args.amount as bigint) ?? 0n,
          detail: entry.detail,
          block: raw.blockNumber,
          time: 0,
          hash: raw.transactionHash,
        });
        blockTimes.set(raw.blockNumber, 0);
      }

      // Timestamps come from the blocks the surviving rows actually sit in,
      // fetched once per block rather than once per row.
      const uniqueBlocks = [...blockTimes.keys()];
      const fetched = await Promise.all(
        uniqueBlocks.map((b) =>
          client
            .getBlock({ blockNumber: b })
            .then((blk) => [b, Number(blk.timestamp)] as const)
            .catch(() => [b, 0] as const),
        ),
      );
      const timeByBlock = new Map(fetched);
      for (const r of rows) r.time = timeByBlock.get(r.block) ?? 0;

      rows.sort((a, b) => Number(b.block - a.block));
      setHistory(rows);
    } catch (e) {
      setHistoryError(
        e instanceof Error ? e.message.split("\n")[0] : "Could not read your history.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [client, user.address]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Cumulative earnings, oldest to newest, built from the claims themselves.
  const chartData: Point[] = useMemo(() => {
    const claims = history
      .filter((r) => r.kind === "Claimed" || r.kind === "Referral claimed")
      .sort((a, b) => Number(a.block - b.block));

    let y = 0;
    let r = 0;
    const pts: Point[] = [];
    for (const c of claims) {
      const v = Number(c.amount) / 1e6;
      if (c.kind === "Claimed") y += v;
      else r += v;
      pts.push({ t: c.time, yield: y, referral: r });
    }
    return pts;
  }, [history]);

  const planIndex = Number(user.plan ?? 0n);
  const plan = PLANS[planIndex];
  const level = Number(user.level ?? 0n);
  const start = Number(user.startTime ?? 0n);
  const termSeconds = plan.durationDays * 86400;
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - start);
  const progress = Math.min(100, (elapsed / termSeconds) * 100);

  const totalEarned = (user.totalClaimed ?? 0n) + (user.refTotalEarned ?? 0n);
  const claimableNow = (user.pendingReward ?? 0n) + (user.refPending ?? 0n);

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Portfolio</span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your position
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">No position</Badge>}
          <Badge tone="brand">{REFERRAL_LEVELS[level].name}</Badge>
        </div>
      </div>

      {protocol.emergencyMode && (
        <Alert tone="bad" title="The protocol is in emergency mode">
          New stakes are frozen. Your principal is recoverable with no penalty once emergency
          withdrawal opens.
        </Alert>
      )}

      {/* Headline figures */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Claimable now"
          value={claimableNow}
          sub="Yield + referral, ready to withdraw"
          lead
          loading={user.isLoading}
        />
        <Stat
          label="Staked principal"
          value={user.amount}
          sub={user.active ? `${plan.name} · ${formatBps(Number(user.rate ?? 0n))}/day` : "No active stake"}
          loading={user.isLoading}
        />
        <Stat
          label="Total earned"
          value={totalEarned}
          sub="Lifetime, across both sources"
          loading={user.isLoading}
        />
        <Stat
          label="Team volume"
          value={user.teamVolume}
          sub={`${(user.activeReferrals ?? 0n).toString()} active referrals`}
          loading={user.isLoading}
        />
      </div>

      {/* Position detail */}
      {user.active && (
        <Section title="Position detail" description="Everything the contract records about this stake.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[.07] text-xs uppercase tracking-wider text-ink-400">
                  <th className="py-3 font-medium">Plan</th>
                  <th className="py-3 font-medium">Principal</th>
                  <th className="py-3 font-medium">Rate</th>
                  <th className="py-3 font-medium">Term</th>
                  <th className="py-3 font-medium">Claimed</th>
                  <th className="py-3 text-right font-medium">Accruing now</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4">
                    <span className="font-display font-semibold text-white">{plan.name}</span>
                    {user.freeStake && <span className="ml-2 text-xs text-ink-400">free</span>}
                  </td>
                  <td className="py-4 tabular-nums text-ink-100">{formatAmount(user.amount)}</td>
                  <td className="py-4 tabular-nums text-brand-300">
                    {formatBps(Number(user.rate ?? 0n))}
                  </td>
                  <td className="w-52 py-4">
                    <div className="flex items-center gap-3">
                      <Progress value={progress} max={100} />
                      <span className="shrink-0 text-xs tabular-nums text-ink-400">
                        {Math.floor(elapsed / 86400)}/{plan.durationDays}d
                      </span>
                    </div>
                  </td>
                  <td className="py-4 tabular-nums text-ink-200">
                    {formatAmount(user.totalClaimed)}
                  </td>
                  <td className="py-4 text-right font-semibold tabular-nums text-brand-300">
                    {formatAmount(user.pendingReward, 4)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Earnings over time */}
      <Section
        title="Earnings over time"
        description="Cumulative, built from your own claim events — not a projection."
        action={
          <button className="btn-ghost" onClick={loadHistory} disabled={loadingHistory}>
            {loadingHistory ? "Loading…" : "Refresh"}
          </button>
        }
      >
        {loadingHistory ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <EarningsChart data={chartData} />
        )}
      </Section>

      {/* History */}
      <Section
        title="Transaction history"
        description="Every action you have taken, decoded from on-chain events."
      >
        {reduced && (
          <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            This RPC endpoint does not serve deep history, so only the last ~20 minutes is shown.
            Point NEXT_PUBLIC_POLYGON_RPC_URL at an archive-capable provider for the full window.
          </div>
        )}

        {historyError ? (
          <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {historyError}
          </div>
        ) : loadingHistory ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            title="No activity in this window"
            hint="Your stakes, top-ups and claims will appear here as they happen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[.07] text-xs uppercase tracking-wider text-ink-400">
                  <th className="py-3 font-medium">Action</th>
                  <th className="py-3 font-medium">Detail</th>
                  <th className="py-3 font-medium">When</th>
                  <th className="py-3 text-right font-medium">Amount</th>
                  <th className="py-3 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr
                    key={r.key}
                    className="border-b border-white/[.04] transition last:border-0 hover:bg-white/[.03]"
                  >
                    <td className="py-3.5">
                      <Badge tone={KIND_TONE[r.kind] ?? "neutral"}>{r.kind}</Badge>
                    </td>
                    <td className="py-3.5 text-ink-300">{r.detail}</td>
                    <td className="py-3.5 tabular-nums text-ink-400">
                      {r.time ? new Date(r.time * 1000).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : `block ${r.block}`}
                    </td>
                    <td className="py-3.5 text-right font-semibold tabular-nums text-white">
                      {formatAmount(r.amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <a
                        className="font-mono text-xs text-brand-400 underline underline-offset-4 hover:text-brand-300"
                        href={`${EXPLORER}/tx/${r.hash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.hash.slice(0, 8)}…
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  lead,
  loading,
}: {
  label: string;
  value: bigint | undefined;
  sub: string;
  lead?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`card card-hover ${lead ? "bg-gradient-to-br from-brand-900/30 to-ink-900/70" : ""}`}
    >
      <p className="text-sm text-ink-300">{label}</p>
      <p className="stat-value mt-2">
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <>
            <span className={lead ? "text-gradient-brand" : ""}>{formatAmount(value)}</span>
            <span className="ml-1.5 text-base font-medium text-ink-400">USDT</span>
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-ink-400">{sub}</p>
    </div>
  );
}

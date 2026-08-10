"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { EarningsChart, type Point } from "@/components/EarningsChart";
import { Alert, Badge, EmptyState, Progress, Section, Skeleton, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";
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
      <div className="container-page py-20 sm:py-28">
        <div className="glass mx-auto max-w-lg p-8 text-center sm:p-10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-gold-400">
            <Icon name="chart" className="h-6 w-6" />
          </span>
          <h1 className="h-section mt-5">Portfolio</h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-graphite-300">
            Connect your wallet to see your positions, earnings and full transaction history —
            reconstructed from on-chain events, not from a database.
          </p>
          <div className="mt-7 flex justify-center">
            <ConnectButton />
          </div>
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
    <div className="container-page space-y-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">
            <Icon name="chart" className="h-3.5 w-3.5" />
            Portfolio
          </span>
          <h1 className="h-section mt-4">Your position</h1>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Claimable now"
          value={claimableNow}
          sub="Yield + referral, ready to withdraw"
          icon="zap"
          lead
          loading={user.isLoading}
        />
        <Stat
          label="Staked principal"
          value={user.amount}
          sub={user.active ? `${plan.name} · ${formatBps(Number(user.rate ?? 0n))}/day` : "No active stake"}
          icon="wallet"
          loading={user.isLoading}
        />
        <Stat
          label="Total earned"
          value={totalEarned}
          sub="Lifetime, across both sources"
          icon="arrowDown"
          loading={user.isLoading}
        />
        <Stat
          label="Team volume"
          value={user.teamVolume}
          sub={`${(user.activeReferrals ?? 0n).toString()} active referrals`}
          icon="users"
          loading={user.isLoading}
        />
      </div>

      {(user.grossDeposited ?? 0n) > 0n && (
        <Section
          title="Deposit reconciliation"
          description="What left your wallet, what the platform charged, and what the contract recorded as your stake — all from the contract's own counters."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Sent from your wallet", value: user.grossDeposited, tone: "" },
              { label: "Development & promotion fee", value: user.platformFeePaid, tone: "text-graphite-300" },
              { label: "Recorded as your stake", value: user.netStaked, tone: "text-gold-gradient" },
            ].map((r) => (
              <div key={r.label} className="rounded-xl border border-white/[.06] bg-white/[.02] p-4">
                <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
                  {r.label}
                </p>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white">
                  <span className={r.tone}>{formatAmount(r.value)}</span>
                  <span className="ml-1.5 text-sm font-semibold text-graphite-400">USDT</span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Position detail */}
      {user.active && (
        <Section title="Position detail" description="Everything the contract records about this stake.">
          {/* A single-row table is a table only by habit. As a field grid it
              reflows at every width instead of forcing a scrollbar on a phone. */}
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
            <Field label="Plan">
              <span className="font-display font-semibold text-white">{plan.name}</span>
              {user.freeStake && <span className="ml-2 text-xs text-graphite-400">free</span>}
            </Field>
            <Field label="Principal">
              <span className="tabular-nums text-graphite-50">{formatAmount(user.amount)} USDT</span>
            </Field>
            <Field label="Daily rate">
              <span className="tabular-nums text-gold-300">{formatBps(Number(user.rate ?? 0n))}</span>
            </Field>
            <Field label="Claimed to date">
              <span className="tabular-nums text-graphite-50">
                {formatAmount(user.totalClaimed)} USDT
              </span>
            </Field>
            <Field label="Accruing now">
              <span className="font-semibold tabular-nums text-gold-300">
                {formatAmount(user.pendingReward, 4)} USDT
              </span>
            </Field>
            <div className="sm:col-span-3 xl:col-span-5">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
                  Term progress
                </span>
                <span className="text-xs tabular-nums text-graphite-400">
                  {Math.floor(elapsed / 86400)}/{plan.durationDays} days
                </span>
              </div>
              <Progress value={progress} max={100} />
            </div>
          </dl>
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
          <div className="mb-4 rounded-xl border border-warn-400/25 bg-warn-500/10 px-4 py-3 text-sm text-warn-400">
            This RPC endpoint does not serve deep history, so only the last ~20 minutes is shown.
            Point NEXT_PUBLIC_POLYGON_RPC_URL at an archive-capable provider for the full window.
          </div>
        )}

        {historyError ? (
          <div className="rounded-xl border border-danger-400/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
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
          <>
          {/* Phones get a card list. A five-column table at 360px is a
              horizontal scrollbar wearing a layout as a disguise. */}
          <ul className="space-y-2.5 lg:hidden">
            {history.map((r) => (
              <li key={r.key} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <Badge tone={KIND_TONE[r.kind] ?? "neutral"}>{r.kind}</Badge>
                  <span className="shrink-0 text-right font-semibold tabular-nums text-white">
                    {formatAmount(r.amount)}
                    <span className="ml-1 text-xs font-normal text-graphite-400">USDT</span>
                  </span>
                </div>
                <p className="mt-2.5 text-sm text-graphite-300">{r.detail}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs tabular-nums text-graphite-400">
                    {r.time
                      ? new Date(r.time * 1000).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : `block ${r.block}`}
                  </span>
                  <a
                    className="font-mono text-xs text-volt-400 underline underline-offset-4 hover:text-volt-300"
                    href={`${EXPLORER}/tx/${r.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.hash.slice(0, 10)}…
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[.07] text-xs uppercase tracking-wider text-graphite-400">
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
                    <td className="py-3.5 text-graphite-300">{r.detail}</td>
                    <td className="py-3.5 tabular-nums text-graphite-400">
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
                        className="font-mono text-xs text-volt-400 underline underline-offset-4 hover:text-volt-300"
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
          </>
        )}
      </Section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">{label}</dt>
      <dd className="mt-1.5 text-[15px]">{children}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  lead,
  loading,
  icon,
}: {
  label: string;
  value: bigint | undefined;
  sub: string;
  lead?: boolean;
  loading?: boolean;
  icon: "zap" | "wallet" | "arrowDown" | "users";
}) {
  return (
    <StatCard
      label={label}
      lead={lead}
      loading={loading}
      sub={sub}
      icon={<Icon name={icon} className="h-5 w-5" />}
      value={
        <>
          {formatAmount(value)}
          <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
        </>
      }
    />
  );
}

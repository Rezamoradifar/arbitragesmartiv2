"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { EmptyState, Section, Skeleton, Badge } from "@/components/ui";
import { CONTRACT_ABI, CONTRACT_ADDRESS, EXPLORER, formatAmount, shortAddress } from "@/lib/contract";

/** Events surfaced in the feed, with how each one should read. */
const TRACKED = [
  "Staked",
  "ToppedUp",
  "PlanUpgraded",
  "Claimed",
  "ReferralClaimed",
  "EarlyExited",
  "EmergencyWithdrawn",
  "ArbitrageSplitExecuted",
  "ArbitrageMergeExecuted",
  "ArbitrageRedeemed",
  "ArbitrageProfitAccrued",
  "ProfitFeeCharged",
  "PartnerAdded",
  "PartnerRemoved",
  "EmergencyVoted",
  "EmergencyVoteRevoked",
  "EmergencyActivated",
  "EmergencyCancelled",
  "RescueVoted",
  "RescueInitiated",
  "RescueExecuted",
  "EmergencyPaused",
] as const;

type Entry = {
  key: string;
  name: string;
  block: bigint;
  hash: string;
  args: Record<string, unknown>;
};

/**
 * An unfiltered `getLogs` result: viem widens `topics` to a union that only
 * narrows when the query is scoped to a specific event, so the fields the
 * decoder needs are spelled out here.
 */
type RawLog = {
  data: `0x${string}`;
  topics: [] | [signature: `0x${string}`, ...args: `0x${string}`[]];
  blockNumber: bigint | null;
  transactionHash: `0x${string}` | null;
  logIndex: number | null;
};

const TONE: Record<string, "neutral" | "good" | "warn" | "bad" | "brand"> = {
  Staked: "good",
  ToppedUp: "good",
  PlanUpgraded: "brand",
  Claimed: "brand",
  ReferralClaimed: "brand",
  EarlyExited: "warn",
  EmergencyWithdrawn: "warn",
  EmergencyVoted: "warn",
  EmergencyVoteRevoked: "neutral",
  EmergencyActivated: "bad",
  EmergencyCancelled: "good",
  RescueVoted: "bad",
  RescueInitiated: "bad",
  RescueExecuted: "bad",
  EmergencyPaused: "warn",
};

export default function ActivityPage() {
  const client = usePublicClient();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "staking" | "governance" | "arbitrage">("all");

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const latest = await client.getBlockNumber();
      // Polygon produces ~2s blocks; 200k blocks is roughly the last five days,
      // which is what most RPC providers will serve in a single range query.
      const fromBlock = latest > 200_000n ? latest - 200_000n : 0n;

      const logs = (await client.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock,
        toBlock: latest,
      })) as unknown as RawLog[];

      const { decodeEventLog } = await import("viem");
      const decoded: Entry[] = [];

      for (const log of logs) {
        try {
          const ev = decodeEventLog({
            abi: CONTRACT_ABI as never,
            data: log.data,
            topics: log.topics,
          }) as unknown as { eventName: string; args: Record<string, unknown> };

          if (!TRACKED.includes(ev.eventName as (typeof TRACKED)[number])) continue;

          decoded.push({
            key: `${log.transactionHash}-${log.logIndex}`,
            name: ev.eventName,
            block: log.blockNumber ?? 0n,
            hash: log.transactionHash ?? "",
            args: ev.args ?? {},
          });
        } catch {
          // Unknown or malformed log for this ABI — skip rather than break the feed.
        }
      }

      decoded.sort((a, b) => Number(b.block - a.block));
      setEntries(decoded);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.split("\n")[0]
          : "Could not load activity from the RPC endpoint.",
      );
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = entries.filter((e) => {
    if (filter === "all") return true;
    if (filter === "staking")
      return ["Staked", "ToppedUp", "PlanUpgraded", "Claimed", "ReferralClaimed", "EarlyExited", "EmergencyWithdrawn"].includes(e.name);
    if (filter === "governance") return e.name.includes("Emergency") || e.name.includes("Rescue") || e.name.includes("Partner");
    return e.name.includes("Arbitrage") || e.name.includes("Profit");
  });

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Activity</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Every protocol action, decoded straight from on-chain events. Nothing here is written by a
          server — it is what the contract emitted.
        </p>
      </div>

      <Section
        title="Recent events"
        description="Approximately the last five days of Polygon blocks."
        action={
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {(["all", "staking", "governance", "arbitrage"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
                filter === f
                  ? "border-brand-600 bg-brand-950/60 text-brand-300"
                  : "border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {error}
            <p className="mt-1 text-red-400/80">
              Public RPC endpoints often limit log queries. Set NEXT_PUBLIC_POLYGON_RPC_URL to a
              private provider for a reliable feed.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : shown.length === 0 && !error ? (
          <EmptyState
            title="No activity in this range"
            hint="Once the contract is live and transactions land, they appear here automatically."
          />
        ) : (
          <div className="space-y-2">
            {shown.slice(0, 100).map((e) => (
              <div
                key={e.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Badge tone={TONE[e.name] ?? "neutral"}>{humanName(e.name)}</Badge>
                  <span className="truncate text-sm text-slate-400">{describe(e)}</span>
                </div>
                <a
                  className="shrink-0 font-mono text-xs text-brand-400 underline underline-offset-2"
                  href={`${EXPLORER}/tx/${e.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  block {e.block.toString()}
                </a>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function humanName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function describe(e: Entry): string {
  const a = e.args;
  const user = a.user ? shortAddress(String(a.user)) : "";
  const amount = typeof a.amount === "bigint" ? formatAmount(a.amount) : null;

  switch (e.name) {
    case "Staked":
      return `${user} staked ${amount} USDT`;
    case "ToppedUp":
      return `${user} added ${amount} USDT`;
    case "PlanUpgraded":
      return `${user} upgraded plan`;
    case "Claimed":
      return `${user} claimed ${amount} USDT`;
    case "ReferralClaimed":
      return `${user} claimed ${amount} USDT in referral rewards`;
    case "EarlyExited":
      return `${user} exited early, receiving ${amount} USDT`;
    case "EmergencyWithdrawn":
      return `${user} withdrew ${amount} USDT under emergency`;
    case "ArbitrageSplitExecuted":
      return `${amount} USDT committed to a Polymarket position`;
    case "ArbitrageMergeExecuted":
      return `${amount} USDT unwound from a position`;
    case "ArbitrageRedeemed":
      return `Position redeemed for ${
        typeof a.collateralReceived === "bigint" ? formatAmount(a.collateralReceived) : "—"
      } USDT`;
    case "ArbitrageProfitAccrued":
      return `${amount} USDT of realized profit credited to the pool`;
    case "ProfitFeeCharged":
      return `Performance fee of ${
        typeof a.feeAmount === "bigint" ? formatAmount(a.feeAmount) : "—"
      } USDT charged`;
    case "PartnerAdded":
      return `${shortAddress(String(a.partner))} joined the voting body`;
    case "PartnerRemoved":
      return `${shortAddress(String(a.partner))} removed from the voting body`;
    case "EmergencyVoted":
    case "RescueVoted":
      return `${shortAddress(String(a.voter))} voted — ${String(a.totalVotes ?? "")} total`;
    case "EmergencyVoteRevoked":
      return `${shortAddress(String(a.voter))} revoked their vote`;
    case "EmergencyActivated":
      return "Emergency mode activated — withdrawals open in 2 days";
    case "EmergencyCancelled":
      return "Emergency cancelled — vote fell below quorum";
    case "RescueInitiated":
      return "Rescue armed — executable in 7 days";
    case "RescueExecuted":
      return `${amount} USDT swept to the recovery wallet`;
    case "EmergencyPaused":
      return "Protocol paused";
    default:
      return "";
  }
}

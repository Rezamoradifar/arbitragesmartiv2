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
  "SwappedToArbitrageToken",
  "SwappedFromArbitrageToken",
  "DevelopmentFeeCharged",
  "DevelopmentFeeWithdrawn",
  "StakeMigrated",
  "StakeGranted",
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

/** Roughly three days of Polygon blocks at ~2s each. */
const LOOKBACK_BLOCKS = 120_000n;
/** Fallback window when the endpoint refuses deep history — about 20 minutes. */
const SHALLOW_LOOKBACK = 600n;
/** Chunk width for that fallback; 1rpc caps eth_getLogs at 50 blocks. */
const CHUNK_BLOCKS = 45n;
/** Chunks in flight at once — enough to be quick, low enough to avoid 429s. */
const CHUNK_CONCURRENCY = 4;

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

const TONE: Record<string, "neutral" | "good" | "warn" | "bad" | "brand" | "volt"> = {
  Staked: "good",
  ToppedUp: "good",
  StakeMigrated: "volt",
  StakeGranted: "volt",
  PlanUpgraded: "brand",
  Claimed: "brand",
  ReferralClaimed: "brand",
  DevelopmentFeeCharged: "neutral",
  DevelopmentFeeWithdrawn: "neutral",
  SwappedToArbitrageToken: "volt",
  SwappedFromArbitrageToken: "volt",
  ArbitrageSplitExecuted: "volt",
  ArbitrageMergeExecuted: "volt",
  ArbitrageRedeemed: "volt",
  ArbitrageProfitAccrued: "good",
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
  const [partial, setPartial] = useState(false);
  const [filter, setFilter] = useState<"all" | "staking" | "governance" | "arbitrage">("all");

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const latest = await client.getBlockNumber();
      const fullFrom = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

      // Free Polygon endpoints differ in what they will serve, and the binding
      // constraint is archive DEPTH rather than range width: several happily
      // answer a query over recent blocks but refuse the same width once it
      // reaches back a few days (drpc and publicnode gate history behind a paid
      // plan or a token; 1rpc caps at 50 blocks outright). Only an archive-
      // capable endpoint — Tenderly among the free ones, or any private
      // provider — serves the whole window.
      //
      // So: ask for the full window in one call, and if that is refused, fall
      // back to a short recent window in small chunks, which every endpoint
      // tested does serve. The UI says which of the two happened rather than
      // quietly showing a truncated feed as if it were complete.
      let logs: RawLog[] = [];
      let reduced = false;

      try {
        logs = (await client.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock: fullFrom,
          toBlock: latest,
        })) as unknown as RawLog[];
      } catch {
        reduced = true;
        const shallowFrom = latest > SHALLOW_LOOKBACK ? latest - SHALLOW_LOOKBACK : 0n;

        const ranges: Array<{ from: bigint; to: bigint }> = [];
        for (let start = shallowFrom; start <= latest; start += CHUNK_BLOCKS + 1n) {
          const end = start + CHUNK_BLOCKS > latest ? latest : start + CHUNK_BLOCKS;
          ranges.push({ from: start, to: end });
        }

        let failed = 0;
        for (let i = 0; i < ranges.length; i += CHUNK_CONCURRENCY) {
          const batch = ranges.slice(i, i + CHUNK_CONCURRENCY);
          const results = await Promise.all(
            batch.map((r) =>
              client
                .getLogs({ address: CONTRACT_ADDRESS, fromBlock: r.from, toBlock: r.to })
                .catch(() => {
                  failed++;
                  return [];
                }),
            ),
          );
          for (const chunk of results) logs.push(...(chunk as unknown as RawLog[]));
        }

        if (failed === ranges.length) {
          throw new Error("This RPC endpoint refused every log query.");
        }
      }

      setPartial(reduced);

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
    return (
      e.name.includes("Arbitrage") || e.name.includes("Profit") || e.name.includes("Swapped")
    );
  });

  return (
    <div className="container-page space-y-6 py-8 sm:py-10">
      <div className="min-w-0">
        <span className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-volt-400" />
          On-chain feed
        </span>
        <h1 className="h-section mt-4">Activity</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Every protocol action, decoded straight from on-chain events. Nothing here is written by a
          server — it is what the contract emitted.
        </p>
      </div>

      <Section
        title="Recent events"
        description="Approximately the last three days of Polygon blocks."
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
              className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium capitalize transition ${
                filter === f
                  ? "border-gold-400/40 bg-gold-500/10 text-gold-300"
                  : "border-white/10 bg-white/[.02] text-graphite-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-danger-400/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
            {error}
            <p className="mt-1 opacity-80">
              Public RPC endpoints often limit log queries. Set NEXT_PUBLIC_POLYGON_RPC_URL to a
              private provider for a reliable feed.
            </p>
          </div>
        )}

        {partial && !error && (
          <div className="mb-4 rounded-xl border border-warn-400/25 bg-warn-500/10 px-4 py-3 text-sm text-warn-400">
            This RPC endpoint does not serve deep history, so only the last ~20 minutes of
            activity is shown. Point NEXT_PUBLIC_POLYGON_RPC_URL at an archive-capable provider
            for the full three-day window.
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
          <ul className="space-y-2">
            {shown.slice(0, 100).map((e) => (
              <li
                key={e.key}
                className="flex flex-col gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-4 py-3 transition hover:border-white/[.12] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Badge tone={TONE[e.name] ?? "neutral"}>{humanName(e.name)}</Badge>
                  <span className="min-w-0 break-words text-sm text-graphite-300">{describe(e)}</span>
                </div>
                <a
                  className="shrink-0 font-mono text-xs text-volt-400 underline underline-offset-2 hover:text-volt-300"
                  href={`${EXPLORER}/tx/${e.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  block {e.block.toString()}
                </a>
              </li>
            ))}
          </ul>
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
    case "SwappedToArbitrageToken":
      return `${
        typeof a.collateralIn === "bigint" ? formatAmount(a.collateralIn) : "—"
      } USDT swapped into the strategy's settlement token`;
    case "SwappedFromArbitrageToken":
      return `${
        typeof a.collateralOut === "bigint" ? formatAmount(a.collateralOut) : "—"
      } USDT swapped back into the pool`;
    case "DevelopmentFeeCharged":
      return `${user} deposited ${
        typeof a.grossAmount === "bigint" ? formatAmount(a.grossAmount) : "—"
      } USDT — ${
        typeof a.netStake === "bigint" ? formatAmount(a.netStake) : "—"
      } recorded as stake after the development fee`;
    case "DevelopmentFeeWithdrawn":
      return `${amount} USDT of collected development fees withdrawn to wallet ${String(
        a.budget ?? "",
      )}`;
    case "StakeMigrated":
      return `${user} migrated a ${amount} USDT position from the previous contract`;
    case "StakeGranted":
      return `${user} received a funded ${amount} USDT promotional position`;
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
      return "Emergency mode activated — penalty-free withdrawals open in 12 hours";
    case "EmergencyCancelled":
      return "Emergency cancelled — vote fell below quorum";
    case "RescueInitiated":
      return "Rescue armed — executable after a 48-hour delay";
    case "RescueExecuted":
      return `${amount} USDT swept to the recovery wallet`;
    case "EmergencyPaused":
      return "Protocol paused";
    default:
      return "";
  }
}

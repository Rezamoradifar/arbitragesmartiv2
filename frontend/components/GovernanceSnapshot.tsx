"use client";

import Link from "next/link";
import { useGovernance, useProtocol } from "@/lib/hooks";
import { AddressLink, Badge, Progress, Skeleton } from "@/components/ui";
import { formatAmount } from "@/lib/contract";

export function GovernanceSnapshot() {
  const gov = useGovernance();
  const protocol = useProtocol();

  const required = Number(gov.requiredVotes ?? 3n);
  const emergencyVotes = Number(gov.emergencyVoteCount ?? 0n);
  const rescueVotes = Number(gov.rescueVoteCount ?? 0n);

  return (
    <section className="card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-50">Live governance state</h2>
          <p className="mt-1 text-sm text-ink-300">
            Read straight from the contract — not a status page someone updates by hand.
          </p>
        </div>
        {protocol.emergencyMode ? (
          <Badge tone="bad">Emergency active</Badge>
        ) : protocol.paused ? (
          <Badge tone="warn">Paused</Badge>
        ) : (
          <Badge tone="good">Operating normally</Badge>
        )}
      </div>

      {gov.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-ink-300">Emergency votes</span>
              <span className="font-semibold text-ink-50">
                {emergencyVotes} / {required}
              </span>
            </div>
            <Progress value={emergencyVotes} max={required} tone={emergencyVotes > 0 ? "warn" : "brand"} />
            <p className="mt-2 text-xs text-ink-400">
              Freezes the protocol and opens no-penalty withdrawals after 2 days.
            </p>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-ink-300">Rescue votes</span>
              <span className="font-semibold text-ink-50">
                {rescueVotes} / {required}
              </span>
            </div>
            <Progress value={rescueVotes} max={required} tone={rescueVotes > 0 ? "bad" : "brand"} />
            <p className="mt-2 text-xs text-ink-400">
              Sweeps to the recovery wallet, but only after 7 days.
            </p>
          </div>
        </div>
      )}

      <dl className="mt-6 grid gap-4 border-t border-white/[.07] pt-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-400">Voting body</dt>
          <dd className="mt-1 font-semibold text-ink-50">{gov.voters.length} members</dd>
        </div>
        <div>
          <dt className="text-ink-400">Owner</dt>
          <dd className="mt-1">
            <AddressLink address={gov.owner} />
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">Recovery wallet</dt>
          <dd className="mt-1">
            <AddressLink address={gov.recoveryWallet} />
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">Liquid balance</dt>
          <dd className="mt-1 font-semibold text-ink-50">
            {formatAmount(protocol.balance)} USDT
          </dd>
        </div>
      </dl>

      <Link
        href="/partners"
        className="mt-5 inline-block text-sm text-brand-400 underline underline-offset-2 hover:text-brand-300"
      >
        See the full voting body and per-member votes →
      </Link>
    </section>
  );
}

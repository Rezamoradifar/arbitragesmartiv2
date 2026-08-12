"use client";

import Link from "next/link";
import { useGovernance, useProtocol } from "@/lib/hooks";
import { Alert, AddressLink, Badge, Progress, Skeleton } from "@/components/ui";
import { formatAmount } from "@/lib/contract";

export function GovernanceSnapshot() {
  const gov = useGovernance();
  const protocol = useProtocol();

  const required = Number(gov.requiredVotes ?? 3n);
  const voterCount = gov.voters.length;
  const emergencyVotes = Number(gov.emergencyVoteCount ?? 0n);
  const rescueVotes = Number(gov.rescueVoteCount ?? 0n);

  return (
    <section className="glass-panel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Live governance state</h2>
          <p className="mt-1 text-sm text-graphite-300">
            Read straight from the contract, not a status page someone updates by hand.
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

      {/*
        A voting body smaller than the quorum cannot ever reach it, which means
        the protections described everywhere else on this page are not in place
        yet. Stating that where the numbers are shown is the only version of
        this page that is true today, and it corrects itself the moment enough
        partners are registered rather than needing anyone to remember.
      */}
      {!gov.isLoading && voterCount < required && (
        <div className="mb-6">
          <Alert
            tone="warn"
            title={`Quorum cannot currently be reached — ${voterCount} ${
              voterCount === 1 ? "voter" : "voters"
            } against ${required} required`}
          >
            The voting body is the owner plus registered partners, and{" "}
            {gov.partnerCount !== undefined ? Number(gov.partnerCount) : 0} partners are registered.
            Until at least {required} voters exist, neither an emergency freeze nor a fund rescue
            can pass — including the ones that exist to check the owner. This is read from the
            contract, so it disappears on its own once the registry is filled.
          </Alert>
        </div>
      )}

      {gov.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-graphite-300">Emergency votes</span>
              <span className="font-semibold text-graphite-50">
                {emergencyVotes} / {required}
              </span>
            </div>
            <Progress value={emergencyVotes} max={required} tone={emergencyVotes > 0 ? "warn" : "volt"} />
            <p className="mt-2 text-xs text-graphite-400">
              Freezes the protocol and opens no-penalty withdrawals 12 hours later.
            </p>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-graphite-300">Rescue votes</span>
              <span className="font-semibold text-graphite-50">
                {rescueVotes} / {required}
              </span>
            </div>
            <Progress value={rescueVotes} max={required} tone={rescueVotes > 0 ? "bad" : "volt"} />
            <p className="mt-2 text-xs text-graphite-400">
              Sweeps to the recovery wallet, but only after a 48-hour delay.
            </p>
          </div>
        </div>
      )}

      <dl className="mt-6 grid gap-4 border-t border-white/[.07] pt-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-graphite-400">Voting body</dt>
          <dd className="mt-1 font-semibold text-graphite-50">{gov.voters.length} members</dd>
        </div>
        <div>
          <dt className="text-graphite-400">Owner</dt>
          <dd className="mt-1">
            <AddressLink address={gov.owner} />
          </dd>
        </div>
        <div>
          <dt className="text-graphite-400">Recovery wallet</dt>
          <dd className="mt-1">
            <AddressLink address={gov.recoveryWallet} />
          </dd>
        </div>
        <div>
          <dt className="text-graphite-400">Liquid balance</dt>
          <dd className="mt-1 font-semibold text-graphite-50">
            {formatAmount(protocol.balance)} USDT
          </dd>
        </div>
      </dl>

      <Link
        href="/partners"
        className="mt-6 inline-block text-sm text-gold-300 underline underline-offset-2 hover:text-gold-300"
      >
        See the full voting body and who has voted →
      </Link>
    </section>
  );
}

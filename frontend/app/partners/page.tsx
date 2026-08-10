"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractTx, TxStatus } from "@/components/TxButton";
import { AddressLink, Alert, Badge, Countdown, Progress, Row, Section, Skeleton } from "@/components/ui";
import { useGovernance, useProtocol } from "@/lib/hooks";
import { CONTRACT_ABI, CONTRACT_ADDRESS, formatAmount, formatDuration } from "@/lib/contract";

export default function PartnersPage() {
  const { isConnected, address } = useAccount();
  const gov = useGovernance();
  const protocol = useProtocol();

  const refresh = () => {
    gov.refetch();
    protocol.refetch();
  };

  const required = Number(gov.requiredVotes ?? 3n);
  const emergencyVotes = Number(gov.emergencyVoteCount ?? 0n);
  const rescueVotes = Number(gov.rescueVoteCount ?? 0n);

  return (
    <div className="container-page space-y-6 py-8 sm:py-10">
      <div className="min-w-0">
        <span className="eyebrow">Governance</span>
        <h1 className="h-section mt-4">Partner governance</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          The voting body is the owner plus up to {Number(gov.maxPartners ?? 4n)} partners. Any{" "}
          {required} of them can freeze the protocol and open withdrawals — the owner holds one vote
          and cannot override the result.
        </p>
      </div>

      {!isConnected ? (
        <Section title="Connect to participate">
          <p className="mb-4 text-sm text-graphite-300">
            Anyone can read this page. Casting a vote requires a wallet in the voting body.
          </p>
          <ConnectButton />
        </Section>
      ) : !gov.isVoter ? (
        <Alert tone="neutral" title="This wallet is not in the voting body">
          Connected as {address}. You can watch governance state here, but only the owner and
          registered partners can vote.
        </Alert>
      ) : (
        <Alert tone="brand" title="You are a member of the voting body">
          {gov.isOwner ? "Connected as the contract owner." : "Connected as a registered partner."}
        </Alert>
      )}

      {/* Current state */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Emergency vote"
          description="Freezes the protocol and opens no-penalty withdrawals for every staker."
          action={
            gov.emergencyMode ? <Badge tone="bad">Active</Badge> : <Badge tone="good">Inactive</Badge>
          }
        >
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-graphite-300">Votes cast</span>
              <span className="font-semibold text-graphite-50">
                {emergencyVotes} / {required}
              </span>
            </div>
            <Progress value={emergencyVotes} max={required} tone={gov.emergencyMode ? "bad" : "warn"} />
          </div>

          {gov.emergencyMode && (
            <div className="mb-4">
              <Row
                label="Staker withdrawals open"
                value={
                  gov.emergencyWithdrawOpen ? (
                    <span className="text-success-400">Open now</span>
                  ) : (
                    <Countdown
                      target={
                        Number(gov.emergencyActivatedAt ?? 0n) + Number(gov.emergencyDelay ?? 0n)
                      }
                      prefix="in"
                    />
                  )
                }
              />
              <Row
                label="Votes revocable"
                value={
                  gov.emergencyWithdrawOpen ? (
                    <span className="text-graphite-300">No — window closed</span>
                  ) : (
                    <span className="text-warn-400">Yes, until withdrawals open</span>
                  )
                }
              />
            </div>
          )}

          <VoteButtons
            canVote={gov.isVoter}
            hasVoted={Boolean(gov.hasVotedEmergency)}
            voteFn="voteEmergency"
            revokeFn="revokeEmergencyVote"
            disabledReason={
              gov.emergencyMode && !gov.hasVotedEmergency
                ? "Emergency mode is already active."
                : undefined
            }
            onDone={refresh}
          />
        </Section>

        <Section
          title="Fund rescue"
          description="Sweeps remaining collateral to the recovery wallet after a 48-hour delay."
          action={
            gov.rescueInitiatedAt && Number(gov.rescueInitiatedAt) > 0 ? (
              <Badge tone="warn">Armed</Badge>
            ) : (
              <Badge tone="neutral">Not armed</Badge>
            )
          }
        >
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-graphite-300">Votes cast</span>
              <span className="font-semibold text-graphite-50">
                {rescueVotes} / {required}
              </span>
            </div>
            <Progress value={rescueVotes} max={required} tone="warn" />
          </div>

          <Row label="Recovery wallet" value={<AddressLink address={gov.recoveryWallet} />} />
          {gov.rescueInitiatedAt && Number(gov.rescueInitiatedAt) > 0 && (
            <Row
              label="Sweep executable"
              value={
                gov.rescueReady ? (
                  <span className="text-warn-400">Ready now</span>
                ) : (
                  <Countdown target={gov.rescueExecutableAt} prefix="in" />
                )
              }
            />
          )}
          <Row
            label="Delay"
            value={formatDuration(Number(gov.rescueDelay ?? 0n))}
          />

          <div className="mt-4">
            <VoteButtons
              canVote={gov.isVoter}
              hasVoted={Boolean(gov.hasVotedRescue)}
              voteFn="voteRescue"
              revokeFn="revokeRescueVote"
              onDone={refresh}
              destructive
            />
          </div>

          <p className="mt-3 text-xs text-graphite-400">
            Revoking a rescue vote is always available, right up until the sweep executes. Stakers&apos;
            own withdrawals open 36 hours before it.
          </p>
        </Section>
      </div>

      {/* Voting body */}
      <Section
        title="Voting body"
        description={`${gov.voters.length} members — the owner plus ${Number(gov.partnerCount ?? 0n)} partner(s).`}
      >
        {gov.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            {/* Card list on a phone: four columns of vote state do not fit
                inside 360px, and a scrollbar is not a substitute for a layout. */}
            <ul className="space-y-2.5 sm:hidden">
              {gov.voters.map((v, i) => (
                <VoterCard
                  key={v}
                  address={v}
                  isOwner={i === 0}
                  isYou={Boolean(address && v.toLowerCase() === address.toLowerCase())}
                />
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[.07] text-xs uppercase tracking-[.1em] text-graphite-400">
                    <th className="py-2.5 font-medium">Member</th>
                    <th className="py-2.5 font-medium">Role</th>
                    <th className="py-2.5 text-right font-medium">Emergency</th>
                    <th className="py-2.5 text-right font-medium">Rescue</th>
                  </tr>
                </thead>
                <tbody>
                  {gov.voters.map((v, i) => (
                    <VoterRow
                      key={v}
                      address={v}
                      isOwner={i === 0}
                      isYou={Boolean(address && v.toLowerCase() === address.toLowerCase())}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* Protocol snapshot */}
      <Section title="What is at stake" description="Balances the voting body is deciding over.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total assets", value: protocol.totalAssets },
            { label: "Liquid balance", value: protocol.balance },
            { label: "In Polymarket positions", value: protocol.arbitrageDeployed },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[.06] bg-white/[.02] p-4">
              <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
                {s.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-white">
                {formatAmount(s.value)}
                <span className="ml-1.5 text-sm font-semibold text-graphite-400">USDT</span>
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function VoterRow({
  address,
  isOwner,
  isYou,
}: {
  address: `0x${string}`;
  isOwner: boolean;
  isYou: boolean;
}) {
  return (
    <tr className="border-b border-white/[.06]">
      <td className="py-2.5">
        <AddressLink address={address} />
        {isYou && <span className="ml-2 text-xs text-gold-300">you</span>}
      </td>
      <td className="py-2.5 text-graphite-300">{isOwner ? "Owner" : "Partner"}</td>
      <td className="py-2.5 text-right">
        <VoteCell address={address} fn="emergencyVotes" />
      </td>
      <td className="py-2.5 text-right">
        <VoteCell address={address} fn="rescueVotes" />
      </td>
    </tr>
  );
}

function VoterCard({
  address,
  isOwner,
  isYou,
}: {
  address: `0x${string}`;
  isOwner: boolean;
  isYou: boolean;
}) {
  return (
    <li className="rounded-xl border border-white/[.06] bg-white/[.02] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AddressLink address={address} />
        <Badge tone={isOwner ? "brand" : "neutral"}>{isOwner ? "Owner" : "Partner"}</Badge>
      </div>
      {isYou && <p className="mt-1 text-xs text-gold-300">this is you</p>}
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-graphite-400">Emergency</p>
          <p className="mt-0.5">
            <VoteCell address={address} fn="emergencyVotes" />
          </p>
        </div>
        <div>
          <p className="text-xs text-graphite-400">Rescue</p>
          <p className="mt-0.5">
            <VoteCell address={address} fn="rescueVotes" />
          </p>
        </div>
      </div>
    </li>
  );
}

function VoteCell({ address, fn }: { address: `0x${string}`; fn: string }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: fn,
    args: [address],
    query: { refetchInterval: 12_000 },
  });
  return data ? (
    <span className="font-medium text-gold-300">Voted</span>
  ) : (
    <span className="text-graphite-400">—</span>
  );
}

function VoteButtons({
  canVote,
  hasVoted,
  voteFn,
  revokeFn,
  disabledReason,
  destructive,
  onDone,
}: {
  canVote: boolean;
  hasVoted: boolean;
  voteFn: string;
  revokeFn: string;
  disabledReason?: string;
  destructive?: boolean;
  onDone: () => void;
}) {
  const tx = useContractTx(onDone);

  if (!canVote) return null;

  return (
    <div>
      {hasVoted ? (
        <button
          className="btn-secondary w-full"
          disabled={tx.isPending || tx.isConfirming}
          onClick={() => tx.call(revokeFn)}
        >
          Revoke my vote
        </button>
      ) : (
        <button
          className={destructive ? "btn-danger w-full" : "btn-primary w-full"}
          disabled={Boolean(disabledReason) || tx.isPending || tx.isConfirming}
          onClick={() => tx.call(voteFn)}
        >
          Cast my vote
        </button>
      )}
      {disabledReason && <p className="mt-2 text-xs text-graphite-400">{disabledReason}</p>}
      <TxStatus {...tx} />
    </div>
  );
}

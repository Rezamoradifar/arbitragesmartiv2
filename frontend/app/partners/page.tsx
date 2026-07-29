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
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Partner governance</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          The voting body is the owner plus up to {Number(gov.maxPartners ?? 4n)} partners. Any{" "}
          {required} of them can freeze the protocol and open withdrawals — the owner holds one vote
          and cannot override the result.
        </p>
      </div>

      {!isConnected ? (
        <Section title="Connect to participate">
          <p className="mb-4 text-sm text-slate-400">
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
              <span className="text-slate-400">Votes cast</span>
              <span className="font-semibold text-slate-100">
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
                    <span className="text-brand-400">Open now</span>
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
                    <span className="text-slate-400">No — window closed</span>
                  ) : (
                    <span className="text-amber-400">Yes, until withdrawals open</span>
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
          description="Sweeps remaining collateral to the recovery wallet after a 7-day delay."
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
              <span className="text-slate-400">Votes cast</span>
              <span className="font-semibold text-slate-100">
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
                  <span className="text-amber-400">Ready now</span>
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

          <p className="mt-3 text-xs text-slate-500">
            Revoking a rescue vote is always available, right up until the sweep executes. Stakers&apos;
            own withdrawals open five days before it.
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
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
        )}
      </Section>

      {/* Protocol snapshot */}
      <Section title="What is at stake" description="Balances the voting body is deciding over.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-400">Total assets</p>
            <p className="mt-1 text-2xl font-bold text-slate-50">
              {formatAmount(protocol.totalAssets)} USDT
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Liquid balance</p>
            <p className="mt-1 text-2xl font-bold text-slate-50">
              {formatAmount(protocol.balance)} USDT
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">In Polymarket positions</p>
            <p className="mt-1 text-2xl font-bold text-slate-50">
              {formatAmount(protocol.arbitrageDeployed)} USDT
            </p>
          </div>
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
    <tr className="border-b border-slate-900">
      <td className="py-2.5">
        <AddressLink address={address} />
        {isYou && <span className="ml-2 text-xs text-brand-400">you</span>}
      </td>
      <td className="py-2.5 text-slate-400">{isOwner ? "Owner" : "Partner"}</td>
      <td className="py-2.5 text-right">
        <VoteCell address={address} fn="emergencyVotes" />
      </td>
      <td className="py-2.5 text-right">
        <VoteCell address={address} fn="rescueVotes" />
      </td>
    </tr>
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
    <span className="text-brand-400">Voted</span>
  ) : (
    <span className="text-slate-600">—</span>
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
          className={`btn-primary w-full ${destructive ? "bg-amber-500 hover:bg-amber-400" : ""}`}
          disabled={Boolean(disabledReason) || tx.isPending || tx.isConfirming}
          onClick={() => tx.call(voteFn)}
        >
          Cast my vote
        </button>
      )}
      {disabledReason && <p className="mt-2 text-xs text-slate-500">{disabledReason}</p>}
      <TxStatus {...tx} />
    </div>
  );
}

"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractTx, TxStatus } from "@/components/TxButton";
import { Alert, Badge, Countdown, EmptyState, Progress, Row, Section, Skeleton } from "@/components/ui";
import { useProtocol, useUserPosition, useReferralTree } from "@/lib/hooks";
import { hasWalletConnect } from "@/lib/wagmi";
import {
  COLLATERAL_ADDRESS,
  CONTRACT_ADDRESS,
  ERC20_ABI,
  MAX_STAKE_UNITS,
  MIN_STAKE_UNITS,
  PENALTY_SCHEDULE,
  PLANS,
  REFERRAL_LEVELS,
  formatAmount,
  formatBps,
  parseUnits6,
  planForAmount,
  projectedYield,
  shortAddress,
} from "@/lib/contract";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-400">Loading…</div>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { isConnected } = useAccount();
  const protocol = useProtocol();
  const user = useUserPosition();

  function refreshAll() {
    user.refetch();
    protocol.refetch();
  }

  if (!isConnected) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Your dashboard</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-300">
          Connect a wallet on Polygon to stake, claim rewards, and track your referral team.
        </p>
        <div className="mt-8 flex justify-center">
          <ConnectButton />
        </div>
        {!hasWalletConnect && (
          <div className="mx-auto mt-8 max-w-lg">
            <Alert tone="warn" title="Mobile and QR wallet connections are disabled">
              No WalletConnect project id is configured, so only browser-extension wallets such as
              MetaMask can connect. Set <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> and
              rebuild to enable Trust Wallet, Rainbow, and mobile QR sign-in.
            </Alert>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <h1 className="text-3xl font-bold tracking-tight text-white">Your dashboard</h1>

      <StatusBanners protocol={protocol} user={user} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {user.active ? (
            <PositionCard user={user} />
          ) : (
            <StakeCard user={user} protocol={protocol} onDone={refreshAll} />
          )}
          {user.active && <ManagePosition user={user} onDone={refreshAll} />}
          <ReferralTeam />
        </div>

        <div className="space-y-6">
          <RewardsCard user={user} onDone={refreshAll} />
          <ReferralCard user={user} onDone={refreshAll} />
          <ExitCard user={user} onDone={refreshAll} />
        </div>
      </div>
    </div>
  );
}

function StatusBanners({
  protocol,
  user,
}: {
  protocol: ReturnType<typeof useProtocol>;
  user: ReturnType<typeof useUserPosition>;
}) {
  return (
    <div className="space-y-3">
      {user.blacklisted && (
        <Alert tone="bad" title="This address is blocked from new stakes and claims">
          Your principal is not frozen — early exit and emergency withdrawal remain available to you.
        </Alert>
      )}
      {protocol.emergencyMode && (
        <Alert tone="bad" title="The protocol is in emergency mode">
          New stakes and arbitrage deployments are frozen.{" "}
          {user.emergencyOpen
            ? "Emergency withdrawal is open — you can recover your full principal with no penalty."
            : "Emergency withdrawal opens shortly; no penalty will be applied."}
        </Alert>
      )}
      {!protocol.emergencyMode && protocol.paused && (
        <Alert tone="warn" title="The protocol is paused">
          Staking and claims are suspended. Early exit remains available.
        </Alert>
      )}
      {protocol.isFreePeriod && (
        <Alert tone="brand" title="Free-stake period is active">
          During this window a stake must be exactly 10 USDT and is recorded as a free position.
          Ends in{" "}
          <Countdown
            target={Math.floor(Date.now() / 1000) + Number(protocol.freeTimeLeft ?? 0n)}
          />
          .
        </Alert>
      )}
    </div>
  );
}

function PositionCard({ user }: { user: ReturnType<typeof useUserPosition> }) {
  const planIndex = Number(user.plan ?? 0n);
  const plan = PLANS[planIndex];
  const start = Number(user.startTime ?? 0n);
  const termSeconds = plan.durationDays * 86400;
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - start);
  const progress = Math.min(100, (elapsed / termSeconds) * 100);
  const endsAt = start + termSeconds;

  return (
    <Section
      title="Your position"
      description="Rewards accrue every second and stop at the end of the term."
      action={
        <div className="flex gap-2">
          <Badge tone="brand">{plan.name}</Badge>
          {user.freeStake && <Badge tone="neutral">Free stake</Badge>}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-ink-300">Staked principal</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">
            {formatAmount(user.amount)}
            <span className="ml-1 text-base font-medium text-ink-400">USDT</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-300">Daily rate</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-brand-400">
            {formatBps(Number(user.rate ?? 0n))}
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-300">Claimed so far</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-white">
            {formatAmount(user.totalClaimed)}
            <span className="ml-1 text-base font-medium text-ink-400">USDT</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-ink-300">Term progress</span>
          <span className="text-ink-200">
            {Math.floor(elapsed / 86400)} / {plan.durationDays} days
          </span>
        </div>
        <Progress value={progress} max={100} />
        <p className="mt-2 text-xs text-ink-400">
          {progress >= 100 ? (
            "Term complete — rewards have stopped accruing."
          ) : (
            <>
              Accrual ends in <Countdown target={endsAt} />
            </>
          )}
        </p>
      </div>

      <div className="mt-6">
        <Row label="Claims made" value={(user.claimCount ?? 0n).toString()} />
        <Row
          label="Projected gross yield over term"
          value={`${projectedYield(Number(user.amount ?? 0n) / 1e6, planIndex).toLocaleString(
            "en-US",
            { maximumFractionDigits: 2 },
          )} USDT`}
        />
        <Row
          label="Referred by"
          value={user.referrer && user.referrer !== ZERO ? shortAddress(user.referrer) : "—"}
        />
      </div>
    </Section>
  );
}

function StakeCard({
  user,
  protocol,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const params = useSearchParams();
  const refFromUrl = params.get("ref") ?? "";
  const [amount, setAmount] = useState("500");
  const [referrer, setReferrer] = useState(refFromUrl);

  const amountUnits = useMemo(() => {
    try {
      return parseUnits6(amount || "0");
    } catch {
      return 0n;
    }
  }, [amount]);

  const planIndex = planForAmount(amountUnits);

  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });
  const stake = useContractTx(onDone);

  const belowMin = amountUnits < MIN_STAKE_UNITS;
  const aboveMax = amountUnits > MAX_STAKE_UNITS;
  const freeMismatch = Boolean(protocol.isFreePeriod) && amountUnits !== MIN_STAKE_UNITS;
  // A free stake never calls transferFrom on-chain — the contract skips it
  // entirely — so neither an allowance nor a wallet balance is required.
  // (This card only renders when the user has no active stake, so a fresh
  // free stake is always available while the free period is still open.)
  const isFreeStake = Boolean(protocol.isFreePeriod) && amountUnits === MIN_STAKE_UNITS;
  const insufficient = !isFreeStake && amountUnits > (user.walletBalance ?? 0n);
  const needsApproval = !isFreeStake && (user.allowance ?? 0n) < amountUnits;

  const problem = belowMin
    ? "Minimum stake is 10 USDT."
    : aboveMax
      ? "Maximum stake is 25,000 USDT."
      : freeMismatch
        ? "During the free period a stake must be exactly 10 USDT."
        : insufficient
          ? "Amount exceeds your wallet balance."
          : null;

  return (
    <Section
      title="Open a position"
      description="Your plan is selected automatically from the amount you stake."
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="amount">
            Amount (USDT)
          </label>
          <input
            id="amount"
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="500"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-ink-400">
              Wallet balance: {formatAmount(user.walletBalance)} USDT
            </span>
            <div className="flex gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setAmount(String(p.minStake))}
                  className="rounded-lg border border-white/10 px-2 py-1 text-ink-300 transition hover:border-brand-400/40 hover:text-brand-300"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {isFreeStake && (
            <p className="mt-2 text-xs text-brand-400">
              Free-stake position — no USDT balance or approval needed. One tap below.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="referrer">
            Referrer address (optional)
          </label>
          <input
            id="referrer"
            className="input font-mono text-sm"
            value={referrer}
            onChange={(e) => setReferrer(e.target.value.trim())}
            placeholder="0x…"
          />
          {refFromUrl && (
            <p className="mt-1.5 text-xs text-brand-400">Referral link detected and pre-filled.</p>
          )}
        </div>

        {amountUnits >= MIN_STAKE_UNITS && (
          <div className="rounded-xl border border-white/[.07] bg-ink-950/60 p-4">
            <p className="text-sm font-medium text-ink-200">
              You will be placed in the {PLANS[planIndex].name} plan
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-ink-400">Daily</p>
                <p className="font-semibold text-brand-400">
                  {formatBps(PLANS[planIndex].dailyBps)}
                </p>
              </div>
              <div>
                <p className="text-ink-400">Term</p>
                <p className="font-semibold text-ink-200">
                  {PLANS[planIndex].durationDays} days
                </p>
              </div>
              <div>
                <p className="text-ink-400">Gross yield</p>
                <p className="font-semibold text-ink-200">
                  {projectedYield(Number(amountUnits) / 1e6, planIndex).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  USDT
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Before the 10% fee applied to each claim. Early exit before week 5 carries a penalty.
            </p>
          </div>
        )}

        {problem && <Alert tone="warn" title={problem} />}

        {needsApproval ? (
          <div>
            <button
              className="btn-primary w-full"
              disabled={Boolean(problem) || approve.isPending || approveReceipt.isLoading}
              onClick={() =>
                approve.writeContract({
                  address: COLLATERAL_ADDRESS,
                  abi: ERC20_ABI,
                  functionName: "approve",
                  args: [CONTRACT_ADDRESS, amountUnits],
                } as never)
              }
            >
              {approve.isPending || approveReceipt.isLoading
                ? "Approving…"
                : `Approve ${formatAmount(amountUnits)} USDT`}
            </button>
            <p className="mt-2 text-xs text-ink-400">
              Step 1 of 2. Approval lets the contract move exactly this amount.
            </p>
            {approveReceipt.isSuccess && (
              <p className="mt-2 text-sm text-brand-400">Approved — you can stake now.</p>
            )}
            {approve.error && (
              <p className="mt-2 text-sm text-red-400">{approve.error.message.split("\n")[0]}</p>
            )}
          </div>
        ) : (
          <div>
            <button
              className="btn-primary w-full"
              disabled={Boolean(problem) || stake.isPending || stake.isConfirming}
              onClick={() =>
                stake.call("stake", [
                  amountUnits,
                  referrer && referrer.length === 42 ? referrer : ZERO,
                ])
              }
            >
              Stake {formatAmount(amountUnits)} USDT
            </button>
            <TxStatus {...stake} />
          </div>
        )}
      </div>
    </Section>
  );
}

function ManagePosition({
  user,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  onDone: () => void;
}) {
  const [topUp, setTopUp] = useState("100");
  const topUpUnits = useMemo(() => {
    try {
      return parseUnits6(topUp || "0");
    } catch {
      return 0n;
    }
  }, [topUp]);

  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });
  const tx = useContractTx(onDone);

  const needsApproval = (user.allowance ?? 0n) < topUpUnits;
  const currentPlan = Number(user.plan ?? 0n);
  const eligiblePlan = planForAmount(user.amount ?? 0n);
  const canUpgrade = eligiblePlan > currentPlan;

  if (user.freeStake) {
    return (
      <Section title="Manage position">
        <Alert tone="neutral" title="Free-period positions cannot be topped up or upgraded">
          Exit this position and open a regular stake to access the paid tiers.
        </Alert>
      </Section>
    );
  }

  return (
    <Section
      title="Manage position"
      description="Add funds to grow your position and unlock higher tiers."
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="topup">
            Top up (USDT)
          </label>
          <div className="flex gap-2">
            <input
              id="topup"
              className="input"
              inputMode="decimal"
              value={topUp}
              onChange={(e) => setTopUp(e.target.value.replace(/[^0-9.]/g, ""))}
            />
            {needsApproval ? (
              <button
                className="btn-secondary shrink-0"
                disabled={approve.isPending || approveReceipt.isLoading}
                onClick={() =>
                  approve.writeContract({
                    address: COLLATERAL_ADDRESS,
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [CONTRACT_ADDRESS, topUpUnits],
                  } as never)
                }
              >
                Approve
              </button>
            ) : (
              <button
                className="btn-primary shrink-0"
                disabled={topUpUnits < MIN_STAKE_UNITS || tx.isPending || tx.isConfirming}
                onClick={() => tx.call("topUp", [topUpUnits])}
              >
                Top up
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-400">
            Minimum top-up is 10 USDT. New total must stay under 25,000 USDT.
          </p>
        </div>

        <div className="rounded-xl border border-white/[.07] bg-ink-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-200">
                Current plan: {PLANS[currentPlan].name}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {canUpgrade
                  ? `Your balance now qualifies for ${PLANS[eligiblePlan].name} (${formatBps(
                      PLANS[eligiblePlan].dailyBps,
                    )}/day).`
                  : "Top up to reach the next tier."}
              </p>
            </div>
            <button
              className="btn-secondary"
              disabled={!canUpgrade || tx.isPending || tx.isConfirming}
              onClick={() => tx.call("upgradePlan")}
            >
              Upgrade plan
            </button>
          </div>
        </div>

        <TxStatus {...tx} />
      </div>
    </Section>
  );
}

function RewardsCard({
  user,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  onDone: () => void;
}) {
  const tx = useContractTx(onDone);
  const pending = user.pendingReward ?? 0n;
  const fee = (pending * 1000n) / 10000n;

  return (
    <Section title="Yield rewards">
      <p className="text-sm text-ink-300">Claimable now</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-brand-400">
        {user.isLoading ? <Skeleton /> : formatAmount(pending, 4)}
        <span className="ml-1 text-base font-medium text-ink-400">USDT</span>
      </p>
      {pending > 0n && (
        <p className="mt-2 text-xs text-ink-400">
          You receive {formatAmount(pending - fee, 4)} after the 10% protocol fee.
        </p>
      )}
      <button
        className="btn-primary mt-4 w-full"
        disabled={pending === 0n || tx.isPending || tx.isConfirming}
        onClick={() => tx.call("claim")}
      >
        Claim rewards
      </button>
      <TxStatus {...tx} />
    </Section>
  );
}

function ReferralCard({
  user,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  onDone: () => void;
}) {
  const tx = useContractTx(onDone);
  const [copied, setCopied] = useState(false);
  const level = Number(user.level ?? 0n);
  const tier = REFERRAL_LEVELS[level];
  const next = REFERRAL_LEVELS[level + 1];

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/dashboard?ref=${user.address}` : "";

  return (
    <Section title="Referral rewards" action={<Badge tone="brand">{tier.name}</Badge>}>
      <p className="text-sm text-ink-300">Claimable now</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-brand-400">
        {formatAmount(user.refPending, 4)}
        <span className="ml-1 text-base font-medium text-ink-400">USDT</span>
      </p>
      <button
        className="btn-primary mt-4 w-full"
        disabled={(user.refPending ?? 0n) === 0n || tx.isPending || tx.isConfirming}
        onClick={() => tx.call("claimRef")}
      >
        Claim referral rewards
      </button>
      <TxStatus {...tx} />

      <div className="mt-5">
        <Row label="Lifetime earned" value={`${formatAmount(user.refTotalEarned)} USDT`} />
        <Row label="Active referrals" value={(user.activeReferrals ?? 0n).toString()} />
        <Row label="Team volume" value={`${formatAmount(user.teamVolume)} USDT`} />
        <Row
          label="— direct (F1)"
          value={`${formatAmount(user.f1Volume)} USDT`}
          hint={`earns ${formatBps(tier.f1Bps)}`}
        />
        <Row
          label="— second level (F2)"
          value={`${formatAmount(user.f2Volume)} USDT`}
          hint={`earns ${formatBps(tier.f2Bps)}`}
        />
      </div>

      {next && (
        <p className="mt-3 text-xs text-ink-400">
          Reach {next.name} with {next.needRefs} active referrals and{" "}
          {next.needStake.toLocaleString("en-US")} USDT staked.
        </p>
      )}

      {!user.active && (
        <Alert tone="warn" title="Your link won't work yet">
          The contract only credits a referral if you already have an active stake at the moment
          your friend stakes. Stake first — anyone who used this link before that point was staked
          normally, but was never linked to you, and that can&apos;t be fixed after the fact.
        </Alert>
      )}

      <div className="mt-5">
        <p className="label">Your referral link</p>
        <div className="flex gap-2">
          <input className="input min-w-0 flex-1 font-mono text-xs" readOnly value={link} />
          <button
            className="btn-secondary shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </Section>
  );
}

function ExitCard({
  user,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  onDone: () => void;
}) {
  const tx = useContractTx(onDone);
  const [confirm, setConfirm] = useState(false);

  if (!user.active) return null;

  const start = Number(user.startTime ?? 0n);
  const weeksElapsed = Math.floor((Math.floor(Date.now() / 1000) - start) / (7 * 86400));
  const penaltyBps = PENALTY_SCHEDULE[Math.min(weeksElapsed, 4)].bps;
  const amount = user.amount ?? 0n;
  const penalty = (amount * BigInt(penaltyBps)) / 10000n;
  const returned = amount - penalty;

  return (
    <Section title="Exit" description="You never need permission to leave.">
      {user.emergencyOpen ? (
        <>
          <Alert tone="good" title="Emergency withdrawal is open">
            Recover your full principal with no penalty applied.
          </Alert>
          <button
            className="btn-primary mt-4 w-full"
            disabled={tx.isPending || tx.isConfirming}
            onClick={() => tx.call("emergencyWithdraw")}
          >
            Withdraw {formatAmount(amount)} USDT
          </button>
        </>
      ) : (
        <>
          <Row label="Principal" value={`${formatAmount(amount)} USDT`} />
          <Row
            label={`Penalty (week ${Math.min(weeksElapsed + 1, 5)})`}
            value={<span className="text-red-400">−{formatAmount(penalty)} USDT</span>}
          />
          <Row label="You receive" value={`${formatAmount(returned)} USDT`} />
          <p className="mt-3 text-xs text-ink-400">
            The penalty drops each week and reaches its 10% floor from week 5. Unclaimed yield is
            forfeited — claim before exiting.
          </p>
          {confirm ? (
            <div className="mt-4 space-y-2">
              <button
                className="btn-primary w-full bg-red-500 hover:bg-red-400"
                disabled={tx.isPending || tx.isConfirming}
                onClick={() => tx.call("earlyExit")}
              >
                Confirm exit — receive {formatAmount(returned)} USDT
              </button>
              <button className="btn-secondary w-full" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="btn-secondary mt-4 w-full" onClick={() => setConfirm(true)}>
              Exit early
            </button>
          )}
        </>
      )}
      <TxStatus {...tx} />
    </Section>
  );
}

function ReferralTeam() {
  const { referrals, isLoading } = useReferralTree();
  const totalStaked = referrals.reduce((sum, r) => sum + r.amount, 0n);

  return (
    <Section
      title="Your team"
      description="Every direct referral and the position they hold — pulled live from the contract, not a spreadsheet."
      action={
        referrals.length > 0 ? (
          <Badge tone="neutral">{referrals.length} member{referrals.length === 1 ? "" : "s"}</Badge>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : referrals.length === 0 ? (
        <EmptyState
          title="No referrals yet"
          hint="Share your referral link to start earning from your team's claims."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-ink-300">
                <tr className="border-b border-white/[.07]">
                  <th className="py-2.5 font-medium">Address</th>
                  <th className="py-2.5 font-medium">Plan</th>
                  <th className="py-2.5 text-right font-medium">Staked</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.address} className="border-b border-white/[.06]">
                    <td className="py-2.5 font-mono text-xs text-ink-200">
                      {shortAddress(r.address)}
                    </td>
                    <td className="py-2.5">
                      {r.amount > 0n ? (
                        <Badge tone="brand">{PLANS[r.plan]?.name ?? "—"}</Badge>
                      ) : (
                        <Badge tone="neutral">inactive</Badge>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-ink-200">{formatAmount(r.amount)} USDT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            {formatAmount(totalStaked)} USDT combined, currently staked by your direct team.
          </p>
        </>
      )}
    </Section>
  );
}

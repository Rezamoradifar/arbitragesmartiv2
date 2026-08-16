"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractTx, TxStatus } from "@/components/TxButton";
import {
  Alert,
  Badge,
  Countdown,
  EmptyState,
  Progress,
  Row,
  Section,
  Skeleton,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { DepositGate } from "@/components/DepositGate";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import {
  useProtocol,
  useUserPosition,
  useReferralTree,
  useDepositQuote,
  useUplineDeduction,
} from "@/lib/hooks";
import { hasWalletConnect } from "@/lib/wagmi";
import {
  COLLATERAL_ADDRESS,
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  ERC20_ABI,
  MAX_STAKE_UNITS,
  MIN_STAKE_UNITS,
  PENALTY_SCHEDULE,
  PLANS,
  PROTOCOL_WALLET_STAKE_UNITS,
  REFERRAL_LEVELS,
  claimFeeBpsFor,
  netClaimAmount,
  formatAmount,
  formatBps,
  parseUnits6,
  grossForNet,
  planForAmount,
  projectedYield,
  shortAddress,
} from "@/lib/contract";
import { getStoredReferral, normaliseRef } from "@/lib/referral";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container-page space-y-5 py-10">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}

function Dashboard() {
  const { isConnected, address } = useAccount();
  const protocol = useProtocol();
  const user = useUserPosition();

  function refreshAll() {
    user.refetch();
    protocol.refetch();
  }

  if (!isConnected) return <ConnectGate />;

  return (
    <div className="container-page space-y-6 py-8 sm:py-10">
      <DashboardHeader address={address} user={user} />

      <StatusBanners protocol={protocol} user={user} />

      <SummaryGrid user={user} />

      {/* Two columns on desktop; on a phone this collapses to a single stack
          ordered by what a user actually needs first — position, then money
          out, then the team. */}
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="order-1 min-w-0 space-y-5 lg:col-span-2 lg:gap-6">
          {user.active ? (
            <PositionCard user={user} />
          ) : (
            <DepositGate>
              <StakeCard user={user} protocol={protocol} onDone={refreshAll} />
            </DepositGate>
          )}
          {user.active && <ManagePosition user={user} protocol={protocol} onDone={refreshAll} />}
          <ReferralTeam />
        </div>

        <div className="order-2 min-w-0 space-y-5">
          <RewardsCard user={user} protocol={protocol} onDone={refreshAll} />
          <ReferralCard user={user} onDone={refreshAll} />
          <ExitCard user={user} onDone={refreshAll} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function DashboardHeader({
  address,
  user,
}: {
  address?: `0x${string}`;
  user: ReturnType<typeof useUserPosition>;
}) {
  const level = Number(user.level ?? 0n);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">
          <span className="h-1.5 w-1.5 rounded-full bg-success-400 shadow-[0_0_10px_2px_rgba(52,211,153,.6)]" />
          Polygon mainnet
        </p>
        <h1 className="h-section mt-3">Dashboard</h1>
        <p className="mt-2 font-mono text-xs text-graphite-400">{shortAddress(address)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={user.active ? "good" : "neutral"}>
          {user.active ? "Position active" : "No active position"}
        </Badge>
        <Badge tone="brand">{REFERRAL_LEVELS[level].name} tier</Badge>
      </div>
    </div>
  );
}

function ConnectGate() {
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="glass overflow-hidden">
        <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <p className="eyebrow">Wallet required</p>
            <h1 className="h-section mt-4">Connect to open your dashboard</h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite-300">
              Your position, your yield and your team are all read from the contract on Polygon.
              Connecting a wallet only lets the page see your address. Nothing moves until you sign
              a transaction.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ConnectButton />
            </div>
            <ul className="mt-8 space-y-2.5">
              {[
                "You see the full deposit split before you sign",
                "Leaving needs no approval from anyone",
                "The contract source is verified on-chain",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-graphite-300">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  {t}
                </li>
              ))}
            </ul>
            {!hasWalletConnect && (
              <div className="mt-7">
                <Alert tone="warn" title="Mobile and QR wallet connections are disabled">
                  No WalletConnect project id is configured, so only browser-extension wallets such
                  as MetaMask can connect. Set <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> and
                  rebuild to enable Trust Wallet, Rainbow, and mobile QR sign-in.
                </Alert>
              </div>
            )}
          </div>
          <div className="hidden lg:block">
            <HeroVisual />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- banners */

function StatusBanners({
  protocol,
  user,
}: {
  protocol: ReturnType<typeof useProtocol>;
  user: ReturnType<typeof useUserPosition>;
}) {
  const freeLeft =
    protocol.maxFreeStakes !== undefined && protocol.freeStakeCount !== undefined
      ? Number(protocol.maxFreeStakes - protocol.freeStakeCount)
      : undefined;

  const anyBanner =
    user.blacklisted || protocol.emergencyMode || protocol.paused || protocol.isFreePeriod;
  if (!anyBanner) return null;

  return (
    <div className="space-y-3">
      {user.blacklisted && (
        <Alert tone="bad" title="This address is blocked from new stakes and claims">
          Your principal is not frozen. Early exit and emergency withdrawal both still work for you.
        </Alert>
      )}
      {protocol.emergencyMode && (
        <Alert tone="bad" title="The protocol is in emergency mode">
          New stakes and arbitrage deployments are frozen.{" "}
          {user.emergencyOpen
            ? "Emergency withdrawal is open. You can take your full principal back with no penalty."
            : "Emergency withdrawal opens shortly, and no penalty will apply."}
        </Alert>
      )}
      {!protocol.emergencyMode && protocol.paused && (
        <Alert tone="warn" title="The protocol is paused">
          Staking and claims are suspended. Early exit remains available.
        </Alert>
      )}
      {protocol.isFreePeriod && (
        <Alert tone="brand" title="Free-stake period is active">
          While this window is open, a stake has to be exactly 10 USDT and is recorded as a free
          position.
          {freeLeft !== undefined && (
            <>
              {" "}
              {freeLeft > 0
                ? `${freeLeft} of ${protocol.maxFreeStakes?.toString()} free places remain.`
                : "All free places have been taken."}
            </>
          )}{" "}
          Window closes in{" "}
          <Countdown target={Math.floor(Date.now() / 1000) + Number(protocol.freeTimeLeft ?? 0n)} />.
        </Alert>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ summary grid */

function SummaryGrid({ user }: { user: ReturnType<typeof useUserPosition> }) {
  const planIndex = Number(user.plan ?? 0n);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        lead
        label="Staked principal"
        loading={user.isLoading}
        value={
          <>
            {formatAmount(user.amount)}
            <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
          </>
        }
        sub={user.active ? `${PLANS[planIndex].name} plan` : "No active position"}
        icon={<Icon name="wallet" className="h-5 w-5" />}
      />
      <StatCard
        label="Claimable yield"
        loading={user.isLoading}
        value={
          <>
            {formatAmount(user.pendingReward, 4)}
            <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
          </>
        }
        sub="Accrues every second while the term runs"
        icon={<Icon name="zap" className="h-5 w-5" />}
      />
      <StatCard
        label="Referral balance"
        loading={user.isLoading}
        value={
          <>
            {formatAmount(user.refPending, 4)}
            <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
          </>
        }
        sub={`${(user.activeReferrals ?? 0n).toString()} active referrals`}
        icon={<Icon name="users" className="h-5 w-5" />}
      />
      <StatCard
        label="Lifetime claimed"
        loading={user.isLoading}
        value={
          <>
            {formatAmount(user.totalClaimed)}
            <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
          </>
        }
        sub={`${(user.claimCount ?? 0n).toString()} claims made`}
        icon={<Icon name="arrowDown" className="h-5 w-5" />}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- position */

function PositionCard({ user }: { user: ReturnType<typeof useUserPosition> }) {
  const planIndex = Number(user.plan ?? 0n);
  const plan = PLANS[planIndex];
  const start = Number(user.startTime ?? 0n);
  const termSeconds = plan.durationDays * 86400;
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - start);
  const progress = Math.min(100, (elapsed / termSeconds) * 100);
  const endsAt = start + termSeconds;
  const daysElapsed = Math.min(plan.durationDays, Math.floor(elapsed / 86400));

  return (
    <Section
      title="Your position"
      description="Rewards build every second and stop when the term ends. Nothing compounds here: yield is worked out on your principal alone."
      action={
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{plan.name}</Badge>
          {user.freeStake && <Badge tone="neutral">Free stake</Badge>}
          {user.isProtocolWallet && <Badge tone="volt">Protocol wallet</Badge>}
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
        <TermRing percent={progress} daysElapsed={daysElapsed} totalDays={plan.durationDays} />

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
                Daily rate
              </p>
              <p className="stat-value mt-1.5 text-gold-gradient">
                {formatBps(Number(user.rate ?? 0n))}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
                Projected gross yield
              </p>
              <p className="stat-value mt-1.5">
                {projectedYield(Number(user.amount ?? 0n) / 1e6, planIndex).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
                <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
              </p>
            </div>
          </div>

          <div>
            <Progress value={progress} max={100} />
            <p className="mt-2.5 text-xs text-graphite-400">
              {progress >= 100 ? (
                "Term complete — rewards have stopped accruing."
              ) : (
                <>
                  Accrual ends in <Countdown target={endsAt} />
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Row label="Claims made" value={(user.claimCount ?? 0n).toString()} />
        <Row label="Claimed to date" value={`${formatAmount(user.totalClaimed)} USDT`} />
        <Row
          label="Referred by"
          value={user.referrer && user.referrer !== ZERO ? shortAddress(user.referrer) : "—"}
        />
      </div>

      {(user.grossDeposited ?? 0n) > 0n && <DepositLedger user={user} />}
    </Section>
  );
}

/**
 * Lifetime deposit reconciliation.
 *
 * The platform fee is taken before the stake is recorded, so a user who only
 * ever sees "staked principal" would have no way to tie that figure back to
 * what left their wallet. This makes the whole path visible after the fact,
 * from the same on-chain counters the contract itself keeps.
 */
function DepositLedger({ user }: { user: ReturnType<typeof useUserPosition> }) {
  return (
    <div className="mt-6 rounded-xl border border-white/[.07] bg-graphite-925/70 p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
        Your deposit history
      </p>
      <div className="mt-3">
        <Row label="Total sent from your wallet" value={`${formatAmount(user.grossDeposited)} USDT`} />
        <Row
          label="Development &amp; promotion fee"
          value={
            <span className="text-graphite-300">−{formatAmount(user.platformFeePaid)} USDT</span>
          }
        />
        <Row label="Recorded as your stake" value={`${formatAmount(user.netStaked)} USDT`} />
      </div>
    </div>
  );
}

/** Circular term-progress indicator. SVG so it stays crisp at any density. */
function TermRing({
  percent,
  daysElapsed,
  totalDays,
}: {
  percent: number;
  daysElapsed: number;
  totalDays: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * c;

  return (
    <div className="relative mx-auto h-[132px] w-[132px] shrink-0 sm:mx-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ringGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4df9c" />
            <stop offset="50%" stopColor="#e0ad3c" />
            <stop offset="100%" stopColor="#b3741f" />
          </linearGradient>
        </defs>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#ringGold)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold tabular-nums text-white">
          {Math.floor(percent)}%
        </span>
        <span className="mt-0.5 text-[11px] text-graphite-400">
          {daysElapsed}/{totalDays}d
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- stake */

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
  const [amount, setAmount] = useState("500");
  const [referrer, setReferrer] = useState("");
  const [refTouched, setRefTouched] = useState(false);
  const [refSource, setRefSource] = useState<"link" | "remembered" | null>(null);

  /*
   * This used to be `useState(refFromUrl)`, which reads the URL exactly once,
   * on the first render — and this page is prerendered, so on that render
   * useSearchParams has nothing to give. The referral silently became the zero
   * address and the deposit went through unattributed. Reading it in an effect
   * picks it up when it actually resolves, and falls back to the copy saved by
   * captureReferral, which survives the trip out to a wallet's browser and
   * back.
   */
  useEffect(() => {
    if (refTouched) return;
    const fromUrl = normaliseRef(params.get("ref"));
    if (fromUrl) {
      setReferrer(fromUrl);
      setRefSource("link");
      return;
    }
    const stored = getStoredReferral();
    if (stored) {
      setReferrer(stored);
      setRefSource("remembered");
    }
  }, [params, refTouched]);

  const amountUnits = useMemo(() => {
    try {
      return parseUnits6(amount || "0");
    } catch {
      return 0n;
    }
  }, [amount]);

  const quote = useDepositQuote(amountUnits);

  /*
   * Whether this referral will actually be recorded.
   *
   * stake() takes a referrer it cannot use and carries on without one — no
   * revert, no event, nothing on screen. The deposit succeeds, the upline gets
   * nobody, and it cannot be corrected afterwards because referrals[user]
   * .referrer is only ever written on the way in. So the three conditions the
   * contract checks are checked here too, before signing, while it is still
   * free to fix.
   */
  const refClean = useMemo(() => normaliseRef(referrer), [referrer]);
  const refIsSelf = Boolean(
    refClean && user.address && refClean.toLowerCase() === user.address.toLowerCase(),
  );
  const { data: refStakeRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getStakeBasic",
    args: [refClean ?? ZERO],
    query: { enabled: Boolean(refClean) && !refIsSelf },
  });
  const refStake = refStakeRaw as readonly unknown[] | undefined;
  const refActive = refStake ? Boolean(refStake[4]) : undefined;

  const refProblem =
    referrer.trim() && !refClean
      ? "That is not a valid wallet address, so no referral will be recorded."
      : refIsSelf
        ? "You cannot refer yourself. No referral will be recorded."
        : refClean && refActive === false
          ? "This referrer has no open position, so the contract will ignore the referral. Ask them to open theirs first — it cannot be attached afterwards."
          : null;
  // The plan tier is decided by what is actually recorded, not by what was
  // sent — so the preview has to use the net figure the contract returns.
  const planIndex = planForAmount(quote.netStake ?? amountUnits);

  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });
  const stake = useContractTx(onDone);

  const freePeriod = Boolean(protocol.isFreePeriod);
  // The two development-fee wallets are a separate case in the contract: barred
  // from the free window entirely, and afterwards held to one exact size. Left
  // unhandled, the form would happily submit and the wallet would get a bare
  // revert with no explanation of which rule it broke.
  const isProtocolWallet = Boolean(user.isProtocolWallet);

  // The contract checks the NET stake against the minimum, not the amount
  // sent. A 10 USDT deposit nets 9 after the fee and reverts with
  // BelowMinStake, so comparing the gross here would enable the button on an
  // amount the contract refuses. During the free window net equals gross, so
  // the same check covers both cases.
  const netForMin = freePeriodNet(quote.netStake, amountUnits, protocol.isFreePeriod);
  const belowMin = netForMin < MIN_STAKE_UNITS;
  const aboveMax = amountUnits > MAX_STAKE_UNITS;
  // Smallest deposit whose net still clears the minimum. The smallest deposits
  // fall in the 12% band, so this is not simply the minimum stake.
  const minGross = parseUnits6(String(grossForNet(10)));
  const freeMismatch = freePeriod && amountUnits !== MIN_STAKE_UNITS;
  const protocolWalletAmountWrong =
    isProtocolWallet && !freePeriod && amountUnits !== PROTOCOL_WALLET_STAKE_UNITS;
  // A free stake never calls transferFrom on-chain — the contract skips it
  // entirely — so neither an allowance nor a wallet balance is required.
  const isFreeStake = freePeriod && amountUnits === MIN_STAKE_UNITS && !isProtocolWallet;
  const insufficient = !isFreeStake && amountUnits > (user.walletBalance ?? 0n);
  const needsApproval = !isFreeStake && (user.allowance ?? 0n) < amountUnits;
  const freeSlotsGone =
    isFreeStake &&
    protocol.freeStakeCount !== undefined &&
    protocol.maxFreeStakes !== undefined &&
    protocol.freeStakeCount >= protocol.maxFreeStakes;

  const problem = isProtocolWallet && freePeriod
    ? "Development-fee wallets cannot open a position during the free-stake window."
    : protocolWalletAmountWrong
      ? "A development-fee wallet must deposit exactly 1,000 USDT."
      : belowMin
        ? `Minimum deposit is ${formatAmount(minGross, 2)} USDT, which is what it takes to record a 10 USDT stake after the fee.`
        : aboveMax
          ? "Maximum deposit is 25,000 USDT."
          : freeMismatch
            ? "During the free-stake window every deposit must be exactly 10 USDT."
            : freeSlotsGone
              ? "All free-stake places have already been taken."
              : insufficient
                ? "Amount exceeds your wallet balance."
                : null;

  return (
    <Section
      title="Open a position"
      description="Your tier is set by the amount the contract records as your stake, which is your deposit minus the fee."
    >
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="amount">
            Deposit amount (USDT)
          </label>
          <div className="relative">
            <input
              id="amount"
              className="input pr-16 font-display text-lg font-semibold"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="500"
            />
            <button
              type="button"
              onClick={() => setAmount(formatUnitsPlain(user.walletBalance))}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-white/[.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-graphite-300 transition hover:border-gold-400/40 hover:text-gold-300"
            >
              Max
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-graphite-400">
              Wallet: {formatAmount(user.walletBalance)} USDT
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setAmount(String(p.minStake))}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-graphite-300 transition hover:border-gold-400/40 hover:text-gold-300"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {isFreeStake && (
            <p className="mt-2.5 text-xs text-gold-300">
              Free position: no USDT balance or approval needed. One tap below.
            </p>
          )}

          {/* The single most-asked question during this window is "why can't I
              deposit more?". Answer it where it is asked, with the time it
              stops being true, rather than only rejecting the amount. */}
          {freePeriod && !isProtocolWallet && (
            <p className="mt-2.5 text-xs leading-relaxed text-graphite-400">
              While the launch window is open the contract takes only 10 USDT, from any wallet.
              Larger deposits, and every tier above Starter, open automatically in{" "}
              <span className="text-graphite-200">
                <Countdown
                  target={Math.floor(Date.now() / 1000) + Number(protocol.freeTimeLeft ?? 0n)}
                />
              </span>
              . Nobody has to do anything to switch them on.
            </p>
          )}

          {isProtocolWallet && (
            <p className="mt-2.5 text-xs leading-relaxed text-graphite-400">
              This is a development-fee wallet. It cannot take a free position, and once the launch
              window closes it can open exactly one position of{" "}
              <span className="text-graphite-200">
                {formatAmount(PROTOCOL_WALLET_STAKE_UNITS)} USDT
              </span>
              , paid for like any other deposit.
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
            onChange={(e) => {
              setRefTouched(true);
              setReferrer(e.target.value.trim());
            }}
            placeholder="0x…"
          />
          {!refProblem && refSource === "link" && (
            <p className="mt-1.5 text-xs text-gold-300">Referral link detected and filled in.</p>
          )}
          {!refProblem && refSource === "remembered" && (
            <p className="mt-1.5 text-xs text-gold-300">
              Using the referral link you arrived through earlier.
            </p>
          )}
          {refProblem && (
            <div className="mt-2">
              <Alert tone="warn" title={refProblem}>
                A referral is recorded at the moment of deposit and can never be added later.
              </Alert>
            </div>
          )}
        </div>

        {amountUnits >= MIN_STAKE_UNITS && !isFreeStake && (
          <DepositBreakdown
            gross={amountUnits}
            quote={quote}
            planIndex={planIndex}
            feeBps={quote.feeBps}
          />
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
            <p className="mt-2.5 text-xs text-graphite-400">
              Step 1 of 2. This approval lets the contract move exactly this amount and no more.
            </p>
            {approveReceipt.isSuccess && (
              <p className="mt-2 text-sm text-success-400">Approved. You can stake now.</p>
            )}
            {approve.error && (
              <p className="mt-2 text-sm text-danger-400">{approve.error.message.split("\n")[0]}</p>
            )}
          </div>
        ) : (
          <div>
            <button
              className="btn-primary w-full"
              disabled={Boolean(problem) || stake.isPending || stake.isConfirming}
              onClick={() =>
                stake.call("stake", [amountUnits, refIsSelf ? ZERO : (refClean ?? ZERO)])
              }
            >
              Deposit {formatAmount(amountUnits)} USDT
            </button>
            <TxStatus {...stake} />
          </div>
        )}
      </div>
    </Section>
  );
}

/**
 * The pre-signature disclosure.
 *
 * This panel is the whole reason the deposit fee can be called transparent: it
 * shows, before the user signs, exactly how much leaves their wallet, how much
 * the platform keeps, and how much is credited as their stake — all read from
 * `quoteDeposit` on the contract rather than recomputed here. If it ever
 * disappears, the fee stops being disclosed and starts being a surprise.
 */
function DepositBreakdown({
  gross,
  quote,
  planIndex,
  feeBps,
}: {
  gross: bigint;
  quote: ReturnType<typeof useDepositQuote>;
  planIndex: number;
  feeBps?: bigint;
}) {
  const net = quote.netStake;
  const fee = quote.totalFee;
  const plan = PLANS[planIndex];

  // Depositing exactly a tier's minimum lands one tier below it, because the
  // tier is read off the recorded stake. Say so before they sign rather than
  // letting them discover it in their position card afterwards.
  const grossPlan = planForAmount(gross);
  const droppedATier = grossPlan > planIndex;
  const nextUp = PLANS[planIndex + 1];
  const netBps = 10000n - (feeBps ?? 1000n);
  // Round up: a cent short of a threshold is as short as a dollar short.
  const needed =
    nextUp && netBps > 0n
      ? (BigInt(nextUp.minStake) * 1_000000n * 10000n + netBps - 1n) / netBps
      : 0n;

  return (
    <div className="overflow-hidden rounded-xl border border-gold-400/20 bg-gold-500/[.04]">
      <div className="flex items-center gap-2 border-b border-gold-400/15 px-4 py-3">
        <Icon name="info" className="h-4 w-4 shrink-0 text-gold-400" />
        <p className="text-sm font-semibold text-gold-100">Before you sign</p>
      </div>

      <div className="px-4 py-3.5">
        {quote.isLoading || net === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="space-y-0">
              <Row label="Leaves your wallet" value={`${formatAmount(gross)} USDT`} />
              <Row
                label={`Development & promotion fee${feeBps ? ` (${formatBps(feeBps)})` : ""}`}
                value={<span className="text-graphite-300">−{formatAmount(fee, 4)} USDT</span>}
              />
              <Row
                label="Recorded as your stake"
                value={
                  <span className="font-semibold text-gold-300">{formatAmount(net, 4)} USDT</span>
                }
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-white/[.06] bg-graphite-950/50 p-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-graphite-400">Plan</p>
                <p className="mt-0.5 truncate font-semibold text-white">{plan.name}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-graphite-400">Daily</p>
                <p className="mt-0.5 font-semibold text-gold-300">{formatBps(plan.dailyBps)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-graphite-400">Term</p>
                <p className="mt-0.5 font-semibold text-white">{plan.durationDays}d</p>
              </div>
            </div>

            {droppedATier && nextUp && (
              <p className="mt-3 rounded-lg border border-warn-400/25 bg-warn-500/10 px-3 py-2 text-xs leading-relaxed text-warn-400">
                {formatAmount(gross)} USDT would reach {PLANS[grossPlan].name} before the fee, but the
                tier comes from the recorded stake, so this deposit lands in {plan.name}. Send{" "}
                {formatAmount(needed)} USDT to reach {nextUp.name}.
              </p>
            )}

            <p className="mt-3 text-xs leading-relaxed text-graphite-400">
              Yield is worked out on the recorded stake rather than the amount you sent, and it is
              simple interest, not compounded. Claiming costs a separate 10% fee, and leaving before
              week five costs a penalty on your principal.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Net stake to compare against the minimum, with gross as the fallback while
 *  the quote is still in flight. */
function freePeriodNet(net: bigint | undefined, gross: bigint, freePeriod?: boolean): bigint {
  if (freePeriod) return gross;
  return net ?? gross;
}

/** Plain decimal string with no separators — safe to feed back into the input. */
function formatUnitsPlain(value: bigint | undefined): string {
  if (!value) return "0";
  const whole = value / 1_000000n;
  const frac = (value % 1_000000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/* ------------------------------------------------------------------ manage */

function ManagePosition({
  user,
  protocol,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  protocol: ReturnType<typeof useProtocol>;
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

  const quote = useDepositQuote(topUpUnits);
  const approve = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({ hash: approve.data });
  const tx = useContractTx(onDone);

  const needsApproval = (user.allowance ?? 0n) < topUpUnits;
  const currentPlan = Number(user.plan ?? 0n);
  const eligiblePlan = planForAmount(user.amount ?? 0n);
  const canUpgrade = eligiblePlan > currentPlan;

  /*
   * A free position is not a dead end.
   *
   * This panel used to tell free-stake holders that they could neither top up
   * nor upgrade, and to exit and start again. Both halves were wrong and the
   * advice was harmful: topUp explicitly accepts free positions — V4 opened
   * that door precisely because V3 stranding its giveaway users was the
   * problem — and exiting throws the giveaway away for nothing.
   *
   * It also hid the thing that matters most to them. A free position accrues
   * yield but cannot CLAIM any of it until the holder has deposited real
   * collateral, so a free user who is never shown this panel watches a balance
   * grow that they can never touch, with no explanation anywhere.
   */
  const activationTarget = protocol.minActivationDeposit ?? MIN_STAKE_UNITS;
  const depositedSoFar = user.grossDeposited ?? 0n;
  const activated = depositedSoFar >= activationTarget;
  const stillNeeded = activated ? 0n : activationTarget - depositedSoFar;

  return (
    <Section
      title="Manage position"
      description={
        user.freeStake && !activated
          ? "Your free position earns from the day it was issued, but claiming needs a real deposit first."
          : "Add funds to grow your position and unlock higher tiers."
      }
    >
      <div className="space-y-5">
        {user.freeStake && !activated && (
          <Alert
            tone="warn"
            title={`Deposit ${formatAmount(stillNeeded, 2)} USDT more to unlock claiming`}
          >
            Your free stake earns from the day it was issued, but the contract will not release
            yield to a position that has never held real collateral — a giveaway is not a
            withdrawal facility. Top up here and the accrued yield becomes claimable; the free
            principal itself stays walled off and is never withdrawable. You do not lose it by
            funding the position, and you do lose it by exiting.
          </Alert>
        )}
        {user.freeStake && activated && (
          <Alert tone="good" title="Your free position is funded and claiming is open">
            The free principal remains separate and is not withdrawable, but everything you have
            deposited on top of it, and all the yield, behaves like any other position.
          </Alert>
        )}
        <div>
          <label className="label" htmlFor="topup">
            Top up (USDT)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
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
          {topUpUnits >= MIN_STAKE_UNITS && quote.netStake !== undefined && (
            <p className="mt-2.5 text-xs text-graphite-400">
              {formatAmount(topUpUnits)} USDT leaves your wallet;{" "}
              <span className="text-gold-300">{formatAmount(quote.netStake, 4)} USDT</span> is added
              to your stake after the {formatAmount(quote.totalFee, 4)} USDT development fee.
            </p>
          )}
          <p className="mt-1.5 text-xs text-graphite-400">
            Minimum top-up is 10 USDT. The new total must stay under 25,000 USDT.
          </p>
        </div>

        <div className="rounded-xl border border-white/[.07] bg-graphite-925/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-graphite-100">
                Current plan: {PLANS[currentPlan].name}
              </p>
              <p className="mt-1 text-xs text-graphite-400">
                {canUpgrade
                  ? `Your balance now qualifies for ${PLANS[eligiblePlan].name} (${formatBps(
                      PLANS[eligiblePlan].dailyBps,
                    )}/day).`
                  : "Top up to reach the next tier."}
              </p>
            </div>
            <button
              className="btn-secondary shrink-0"
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

/* ----------------------------------------------------------------- rewards */

function RewardsCard({
  user,
  protocol,
  onDone,
}: {
  user: ReturnType<typeof useUserPosition>;
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const tx = useContractTx(onDone);
  const pending = user.pendingReward ?? 0n;
  // The claim fee is halved for the two upper plans, so it is read per plan
  // rather than assumed.
  const feeBps = BigInt(claimFeeBpsFor(Number(user.plan ?? 0n)));
  const fee = (pending * feeBps) / 10000n;

  // The claim fee is not the only thing taken out. `claim()` pays
  // `reward - fee - referralPaid`, and the upline share comes out of this
  // wallet's own yield — so quoting `pending - fee` as the payout was simply
  // wrong for anybody with a referrer. The chain is read live rather than
  // banded, because at this point the wallet is connected and the real answer
  // is available.
  const upline = useUplineDeduction();
  const uplineCut = (pending * BigInt(upline.bps)) / 10000n;
  const receives = netClaimAmount(pending, Number(feeBps), upline.bps);

  // A giveaway position earns from day one but cannot withdraw until it has
  // been funded. Saying so here is the difference between a locked button and
  // an unexplained revert.
  const needed = protocol.minActivationDeposit ?? MIN_STAKE_UNITS;
  const locked = Boolean(user.freeStake) && (user.grossDeposited ?? 0n) < needed;

  return (
    <Section title="Yield rewards">
      <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
        Claimable now
      </p>
      <p className="stat-value mt-2 text-gold-gradient">
        {user.isLoading ? <Skeleton className="h-9 w-32" /> : formatAmount(pending, 4)}
        <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
      </p>
      {pending > 0n && (
        <p className="mt-2 text-xs leading-relaxed text-graphite-400">
          You receive{" "}
          <span className="text-graphite-200">{formatAmount(receives, 4)} USDT</span> — the{" "}
          {formatBps(feeBps)} claim fee takes {formatAmount(fee, 4)}
          {upline.hasUpline && upline.bps > 0
            ? `, and ${formatAmount(uplineCut, 4)} goes to your upline as their ${formatBps(
                BigInt(upline.bps),
              )} referral share.`
            : "."}
          {upline.hasUpline && upline.bps === 0 && !upline.isLoading
            ? " Your upline has no active position, so nothing is deducted for them."
            : ""}
        </p>
      )}
      {locked && (
        <div className="mt-4">
          <Alert tone="warn" title="Fund your position to unlock claiming">
            This is a free launch position. It earns from the moment it was opened, but the contract
            will not pay out until you have deposited at least {formatAmount(needed)} USDT of your
            own. Top up below and this unlocks immediately.
          </Alert>
        </div>
      )}

      <button
        className="btn-primary mt-5 w-full"
        disabled={locked || pending === 0n || tx.isPending || tx.isConfirming}
        onClick={() => tx.call("claim")}
      >
        Claim rewards
      </button>
      <TxStatus {...tx} />
    </Section>
  );
}

/* ---------------------------------------------------------------- referral */

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

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Section title="Referral rewards" action={<Badge tone="brand">{tier.name}</Badge>}>
      <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">
        Claimable now
      </p>
      <p className="stat-value mt-2 text-gold-gradient">
        {formatAmount(user.refPending, 4)}
        <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
      </p>
      <button
        className="btn-primary mt-5 w-full"
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

      {/* The contract pays a third level too, but only once the direct
          referrer has reached Silver. Showing 0% at Base is more useful than
          leaving the level out and letting it appear from nowhere later. */}
      <p className="mt-3 text-xs leading-relaxed text-graphite-400">
        Third level (F3) pays{" "}
        <span className="text-graphite-200">
          {tier.f3Bps === 0 ? "nothing at Base tier" : formatBps(tier.f3Bps)}
        </span>
        . All three levels are credited when someone in your team claims, and the amount is
        deducted from that claim — never from their principal.
      </p>

      {next && (
        <p className="mt-3 text-xs leading-relaxed text-graphite-400">
          Reach {next.name} with {next.needRefs} active referrals,{" "}
          {next.needVolume.toLocaleString("en-US")} USDT of direct volume, and{" "}
          {next.needStake.toLocaleString("en-US")} USDT staked yourself. All three are required.
        </p>
      )}

      {!user.active && (
        <div className="mt-4">
          <Alert tone="warn" title="Your link won't work yet">
            A referral only counts if you already have an active stake at the moment your friend
            stakes. So stake first. Anyone who used this link before that staked normally, but was
            never linked to you, and there is no way to fix that afterwards.
          </Alert>
        </div>
      )}

      <div className="mt-5">
        <p className="label">Your referral link</p>
        <button
          type="button"
          onClick={copy}
          className="input block w-full overflow-x-auto whitespace-nowrap text-left font-mono text-xs"
        >
          {link}
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
            {copied ? "Copied" : "Copy link"}
          </button>
          {/* Telegram's share endpoint prefills the message but still makes the
              sender pick a chat and press send, so nothing goes out without
              them seeing it. */}
          <a
            className="btn-secondary"
            href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(SHARE_TEXT)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" className="h-4 w-4" />
            Share
          </a>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-graphite-500">
          Your link only credits you while your own stake is active. Every claim your team makes
          pays you again, for as long as they stay.
        </p>
      </div>
    </Section>
  );
}

/**
 * The message that rides along with a shared referral link.
 *
 * Deliberately free of a return figure. A rate quoted by a friend reads as a
 * promise from that friend, and the rates here are contract settings that the
 * recipient should read for themselves — which is what the link is for.
 */
const SHARE_TEXT =
  "USDT staking on Polygon. Fixed daily rate, fees published in full, and early exit open at any time. Read the contract before you decide:";

/* -------------------------------------------------------------------- exit */

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
            value={<span className="text-danger-400">−{formatAmount(penalty)} USDT</span>}
          />
          <Row
            label="You receive"
            value={<span className="font-semibold text-white">{formatAmount(returned)} USDT</span>}
          />
          <p className="mt-3 text-xs leading-relaxed text-graphite-400">
            The penalty drops each week and settles at 10% from week five. Anything you have not
            claimed is lost, so claim before you exit.
          </p>
          {confirm ? (
            <div className="mt-4 space-y-2">
              <button
                className="btn-danger w-full"
                disabled={tx.isPending || tx.isConfirming}
                onClick={() => tx.call("earlyExit")}
              >
                Confirm exit — receive {formatAmount(returned)} USDT
              </button>
              <button className="btn-ghost w-full" onClick={() => setConfirm(false)}>
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

/* -------------------------------------------------------------------- team */

function ReferralTeam() {
  const { referrals, isLoading } = useReferralTree();
  const totalStaked = referrals.reduce((sum, r) => sum + r.amount, 0n);

  return (
    <Section
      title="Your team"
      description="Everyone you referred directly and the position they hold, read live from the contract."
      action={
        referrals.length > 0 ? (
          <Badge tone="neutral">
            {referrals.length} member{referrals.length === 1 ? "" : "s"}
          </Badge>
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
          {/* Cards on a phone, a table from sm up. A three-column table on a
              360px screen is a horizontal scrollbar pretending to be a layout. */}
          <ul className="space-y-2.5 sm:hidden">
            {referrals.map((r) => (
              <li
                key={r.address}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-white/[.02] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-graphite-200">
                    {shortAddress(r.address)}
                  </p>
                  <p className="mt-1.5">
                    {r.amount > 0n ? (
                      <Badge tone="brand">{PLANS[r.plan]?.name ?? "—"}</Badge>
                    ) : (
                      <Badge tone="neutral">inactive</Badge>
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-white">
                  {formatAmount(r.amount)}
                  <span className="ml-1 text-xs font-normal text-graphite-400">USDT</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[.07]">
                  <th className="py-2.5 text-xs font-medium uppercase tracking-[.1em] text-graphite-400">
                    Address
                  </th>
                  <th className="py-2.5 text-xs font-medium uppercase tracking-[.1em] text-graphite-400">
                    Plan
                  </th>
                  <th className="py-2.5 text-right text-xs font-medium uppercase tracking-[.1em] text-graphite-400">
                    Staked
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.address} className="border-b border-white/[.05] transition hover:bg-white/[.02]">
                    <td className="py-3 font-mono text-xs text-graphite-200">
                      {shortAddress(r.address)}
                    </td>
                    <td className="py-3">
                      {r.amount > 0n ? (
                        <Badge tone="brand">{PLANS[r.plan]?.name ?? "—"}</Badge>
                      ) : (
                        <Badge tone="neutral">inactive</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums text-graphite-100">
                      {formatAmount(r.amount)} USDT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-graphite-400">
            {formatAmount(totalStaked)} USDT combined, currently staked by your direct team.
          </p>
        </>
      )}
    </Section>
  );
}

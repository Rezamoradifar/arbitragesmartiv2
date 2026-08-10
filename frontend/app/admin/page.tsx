"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractTx, TxStatus } from "@/components/TxButton";
import { AddressLink, Alert, Badge, Countdown, Row, Section } from "@/components/ui";
import { useGovernance, useProtocol } from "@/lib/hooks";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  formatAmount,
  formatBps,
  parseUnits6,
} from "@/lib/contract";

export default function AdminPage() {
  const { isConnected } = useAccount();
  const gov = useGovernance();
  const protocol = useProtocol();

  const refresh = () => {
    gov.refetch();
    protocol.refetch();
  };

  if (!isConnected) {
    return (
      <div className="container-page py-20 sm:py-28">
        <div className="glass mx-auto max-w-lg p-8 text-center sm:p-10">
          <h1 className="h-section">Owner console</h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] text-graphite-300">
            Connect the owner wallet to manage the protocol.
          </p>
          <div className="mt-7 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!gov.isOwner) {
    return (
      <div className="container-page space-y-6 py-10">
        <h1 className="h-section">Owner console</h1>
        <Alert tone="neutral" title="This wallet is not the contract owner">
          The owner is <AddressLink address={gov.owner} />. Every action on this page is checked
          on-chain, so another wallet cannot change anything here no matter what this page lets you
          click.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-page space-y-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-section">Owner console</h1>
        <div className="flex gap-2">
          {protocol.emergencyMode && <Badge tone="bad">Emergency mode</Badge>}
          {protocol.paused ? <Badge tone="warn">Paused</Badge> : <Badge tone="good">Live</Badge>}
        </div>
      </div>

      {protocol.emergencyMode && (
        <Alert tone="bad" title="Emergency mode is active">
          Partner registry changes, unpausing, and new arbitrage deployments are all blocked. This
          is deliberate: the owner cannot undo a partner vote. Unwinding positions via merge and
          redeem remains available so stakers can be paid out.
        </Alert>
      )}

      <PauseControls paused={protocol.paused} emergencyMode={protocol.emergencyMode} onDone={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PartnerAdmin gov={gov} onDone={refresh} />
        <RescueAdmin gov={gov} protocol={protocol} onDone={refresh} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WalletAdmin protocol={protocol} onDone={refresh} />
        <BlacklistAdmin onDone={refresh} />
      </div>

      <DevelopmentFeeAdmin protocol={protocol} onDone={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MigrationAdmin protocol={protocol} onDone={refresh} />
        <GrantAdmin protocol={protocol} onDone={refresh} />
      </div>

      <ArbitrageAdmin protocol={protocol} onDone={refresh} />

      <SwapAdmin protocol={protocol} onDone={refresh} />
    </div>
  );
}

function PauseControls({
  paused,
  emergencyMode,
  onDone,
}: {
  paused?: boolean;
  emergencyMode?: boolean;
  onDone: () => void;
}) {
  const tx = useContractTx(onDone);

  return (
    <Section
      title="Protocol state"
      description="Pausing stops staking and claims. Early exit stays available to stakers throughout."
    >
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-secondary"
          disabled={Boolean(paused) || tx.isPending || tx.isConfirming}
          onClick={() => tx.call("pause")}
        >
          Pause
        </button>
        <button
          className="btn-primary"
          disabled={!paused || Boolean(emergencyMode) || tx.isPending || tx.isConfirming}
          onClick={() => tx.call("unpause")}
        >
          Unpause
        </button>
      </div>
      {emergencyMode && (
        <p className="mt-3 text-xs text-warn-400">
          Unpause is blocked while emergency mode is active. Otherwise the owner could close the
          stakers&apos; way out.
        </p>
      )}
      <TxStatus {...tx} />
    </Section>
  );
}

function PartnerAdmin({
  gov,
  onDone,
}: {
  gov: ReturnType<typeof useGovernance>;
  onDone: () => void;
}) {
  const [newPartner, setNewPartner] = useState("");
  const tx = useContractTx(() => {
    setNewPartner("");
    onDone();
  });

  const partners = gov.voters.slice(1);
  const full = Number(gov.partnerCount ?? 0n) >= Number(gov.maxPartners ?? 4n);
  const locked = Boolean(gov.emergencyMode);

  return (
    <Section
      title="Partner registry"
      description={`${Number(gov.partnerCount ?? 0n)} of ${Number(gov.maxPartners ?? 4n)} slots used.`}
    >
      {locked && (
        <Alert tone="warn" title="Registry locked during emergency mode">
          The voting body cannot be changed while a vote is in effect.
        </Alert>
      )}

      <div className={locked ? "pointer-events-none opacity-50" : ""}>
        <div className="mt-4">
          <label className="label" htmlFor="partner">
            Add partner
          </label>
          <div className="flex gap-2">
            <input
              id="partner"
              className="input font-mono text-sm"
              placeholder="0x…"
              value={newPartner}
              onChange={(e) => setNewPartner(e.target.value.trim())}
            />
            <button
              className="btn-primary shrink-0"
              disabled={newPartner.length !== 42 || full || tx.isPending || tx.isConfirming}
              onClick={() => tx.call("addPartner", [newPartner])}
            >
              Add
            </button>
          </div>
          {full && <p className="mt-1.5 text-xs text-warn-400">All partner slots are filled.</p>}
        </div>

        <div className="mt-5 space-y-2">
          {partners.length === 0 ? (
            <p className="text-sm text-graphite-400">No partners registered yet.</p>
          ) : (
            partners.map((p, i) => (
              <div
                key={p}
                className="flex items-center justify-between rounded-xl border border-white/[.07] px-3 py-2"
              >
                <AddressLink address={p} />
                <button
                  className="text-xs text-danger-400 hover:text-danger-400/80"
                  disabled={tx.isPending || tx.isConfirming}
                  onClick={() => tx.call("removePartner", [BigInt(i)])}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-graphite-400">
        Removing a partner moves the last one into their slot, so the remaining indexes can shift.
        The list above always shows the current on-chain order.
      </p>
      <TxStatus {...tx} />
    </Section>
  );
}

function RescueAdmin({
  gov,
  protocol,
  onDone,
}: {
  gov: ReturnType<typeof useGovernance>;
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [wallet, setWallet] = useState("");
  const tx = useContractTx(() => {
    setWallet("");
    onDone();
  });

  const votesPending = Number(gov.rescueVoteCount ?? 0n) > 0;
  const armed = Number(gov.rescueInitiatedAt ?? 0n) > 0;

  return (
    <Section title="Fund rescue" description="Partner-gated sweep to the recovery wallet.">
      <Row label="Recovery wallet" value={<AddressLink address={gov.recoveryWallet} />} />
      <Row
        label="Rescue votes"
        value={`${Number(gov.rescueVoteCount ?? 0n)} / ${Number(gov.requiredVotes ?? 3n)}`}
      />
      {armed && (
        <Row
          label="Executable"
          value={
            gov.rescueReady ? (
              <span className="text-warn-400">Ready</span>
            ) : (
              <Countdown target={gov.rescueExecutableAt} prefix="in" />
            )
          }
        />
      )}

      <div className="mt-4">
        <label className="label" htmlFor="recovery">
          Set recovery wallet
        </label>
        <div className="flex gap-2">
          <input
            id="recovery"
            className="input font-mono text-sm"
            placeholder="0x…"
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
          />
          <button
            className="btn-secondary shrink-0"
            disabled={wallet.length !== 42 || votesPending || tx.isPending || tx.isConfirming}
            onClick={() => tx.call("setRecoveryWallet", [wallet])}
          >
            Set
          </button>
        </div>
        {votesPending && (
          <p className="mt-1.5 text-xs text-warn-400">
            Frozen while rescue votes are outstanding, so the destination cannot be changed under a
            vote that has already been cast.
          </p>
        )}
      </div>

      <button
        className="btn-danger mt-4 w-full"
        disabled={!gov.rescueReady || tx.isPending || tx.isConfirming}
        onClick={() => tx.call("executeRescue")}
      >
        Execute rescue — sweep {formatAmount(protocol.balance)} USDT
      </button>
      <p className="mt-2 text-xs text-graphite-400">
        Needs the partner quorum and the full 48-hour delay. Stakers&apos; own penalty-free
        withdrawals open 36 hours before that.
      </p>
      <TxStatus {...tx} />
    </Section>
  );
}

function WalletAdmin({
  protocol,
  onDone,
}: {
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [fee1, setFee1] = useState("");
  const [fee2, setFee2] = useState("");
  const [recipient, setRecipient] = useState("");
  const [feeBps, setFeeBps] = useState("");
  const tx = useContractTx(onDone);

  return (
    <Section title="Fees" description="Claim fees and the arbitrage performance fee.">
      <Row label="Performance fee" value={formatBps(Number(protocol.profitFeeBps ?? 0n))} />
      <Row label="Claim fee" value="10% (fixed in the contract)" />

      <div className="mt-4 space-y-3">
        <div>
          <label className="label">Fee wallets</label>
          <div className="space-y-2">
            <input
              className="input font-mono text-sm"
              placeholder="Fee wallet 1 (0x…)"
              value={fee1}
              onChange={(e) => setFee1(e.target.value.trim())}
            />
            <input
              className="input font-mono text-sm"
              placeholder="Fee wallet 2 (0x…)"
              value={fee2}
              onChange={(e) => setFee2(e.target.value.trim())}
            />
            <button
              className="btn-secondary w-full"
              disabled={fee1.length !== 42 || fee2.length !== 42 || tx.isPending}
              onClick={() => tx.call("setFeeWallets", [fee1, fee2])}
            >
              Update fee wallets
            </button>
          </div>
        </div>

        <div>
          <label className="label">Profit recipient</label>
          <div className="flex gap-2">
            <input
              className="input font-mono text-sm"
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
            />
            <button
              className="btn-secondary shrink-0"
              disabled={recipient.length !== 42 || tx.isPending}
              onClick={() => tx.call("setProfitRecipient", [recipient])}
            >
              Set
            </button>
          </div>
        </div>

        <div>
          <label className="label">Performance fee (basis points, max 2000)</label>
          <div className="flex gap-2">
            <input
              className="input"
              inputMode="numeric"
              placeholder="1000"
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <button
              className="btn-secondary shrink-0"
              disabled={!feeBps || Number(feeBps) > 2000 || tx.isPending}
              onClick={() => tx.call("setProfitFeeBPS", [BigInt(feeBps)])}
            >
              Set
            </button>
          </div>
          {feeBps && Number(feeBps) > 2000 && (
            <p className="mt-1.5 text-xs text-danger-400">
              The contract hard-caps this at 2000 (20%); the transaction would revert.
            </p>
          )}
        </div>
      </div>
      <TxStatus {...tx} />
    </Section>
  );
}

function BlacklistAdmin({ onDone }: { onDone: () => void }) {
  const [addr, setAddr] = useState("");
  const tx = useContractTx(onDone);

  return (
    <Section title="Blacklist" description="Blocks new stakes and claims. Never blocks exit.">
      <label className="label" htmlFor="bl">
        Address
      </label>
      <input
        id="bl"
        className="input font-mono text-sm"
        placeholder="0x…"
        value={addr}
        onChange={(e) => setAddr(e.target.value.trim())}
      />
      <div className="mt-3 flex gap-2">
        <button
          className="btn-secondary flex-1"
          disabled={addr.length !== 42 || tx.isPending}
          onClick={() => tx.call("setBlacklist", [addr, true])}
        >
          Block
        </button>
        <button
          className="btn-secondary flex-1"
          disabled={addr.length !== 42 || tx.isPending}
          onClick={() => tx.call("setBlacklist", [addr, false])}
        >
          Unblock
        </button>
      </div>
      <p className="mt-3 text-xs text-graphite-400">
        A blocked address can still use early exit and emergency withdrawal, so principal is never
        trapped. Yield that has not been claimed stays out of reach while the block is on.
      </p>
      <TxStatus {...tx} />
    </Section>
  );
}

/**
 * Development-fee treasury.
 *
 * Deliberately shows collected / withdrawn / available rather than a bare
 * "withdraw" button: the contract tracks each budget separately, and an owner
 * who cannot see the remaining balance is an owner who will try to withdraw
 * more than exists and get a revert instead of an answer.
 */
function DevelopmentFeeAdmin({
  protocol,
  onDone,
}: {
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [amount1, setAmount1] = useState("");
  const [amount2, setAmount2] = useState("");
  const [wallet, setWallet] = useState("");
  const [walletBudget, setWalletBudget] = useState<1 | 2>(1);
  const tx = useContractTx(onDone);

  const budgets = [
    { n: 1 as const, amount: amount1, setAmount: setAmount1, bps: protocol.devFeeBps1 },
    { n: 2 as const, amount: amount2, setAmount: setAmount2, bps: protocol.devFeeBps2 },
  ];

  return (
    <Section
      title="Development & promotion fees"
      description="Fees already charged on deposits and shown to the depositor before they signed. This balance is kept apart from pool capital and left out of totalAssets()."
      action={<Badge tone="brand">{formatAmount(protocol.developmentFeeBalance)} USDT held</Badge>}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {budgets.map((b) => (
          <div key={b.n} className="rounded-xl border border-white/[.07] bg-graphite-925/70 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-sm font-semibold text-white">Budget {b.n}</p>
              {b.bps !== undefined && (
                <span className="text-xs text-graphite-400">{formatBps(b.bps)} of each deposit</span>
              )}
            </div>
            <div className="mt-2">
              <BudgetTotals budget={b.n} />
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="input"
                inputMode="decimal"
                placeholder="0.00"
                value={b.amount}
                onChange={(e) => b.setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                aria-label={`Withdraw amount from budget ${b.n}`}
              />
              <button
                className="btn-secondary shrink-0"
                disabled={!b.amount || Number(b.amount) <= 0 || tx.isPending || tx.isConfirming}
                onClick={() => tx.call("withdrawDevelopmentFees", [BigInt(b.n), parseUnits6(b.amount)])}
              >
                Withdraw
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-white/[.07] pt-5">
        <label className="label" htmlFor="devwallet">
          Change a fee wallet
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="input sm:w-40"
            value={walletBudget}
            onChange={(e) => setWalletBudget(Number(e.target.value) as 1 | 2)}
            aria-label="Budget"
          >
            <option value={1}>Budget 1</option>
            <option value={2}>Budget 2</option>
          </select>
          <input
            id="devwallet"
            className="input font-mono text-sm"
            placeholder="0x…"
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
          />
          <button
            className="btn-secondary shrink-0"
            disabled={wallet.length !== 42 || tx.isPending || tx.isConfirming}
            onClick={() => tx.call("setDevelopmentFeeWallet", [BigInt(walletBudget), wallet])}
          >
            Set
          </button>
        </div>
        <p className="mt-2 text-xs text-graphite-400">
          Only the destination address can change. The rates themselves were fixed at deployment
          and no function raises them.
        </p>
      </div>

      <TxStatus {...tx} />
    </Section>
  );
}

function BudgetTotals({ budget }: { budget: 1 | 2 }) {
  const collected = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: `developmentFeesCollected${budget}`,
    query: { refetchInterval: 20_000 },
  });
  const withdrawn = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: `developmentFeesWithdrawn${budget}`,
    query: { refetchInterval: 20_000 },
  });

  const c = (collected.data as bigint | undefined) ?? 0n;
  const w = (withdrawn.data as bigint | undefined) ?? 0n;

  return (
    <div className="text-sm">
      <Row label="Collected" value={`${formatAmount(c)} USDT`} />
      <Row label="Withdrawn" value={`${formatAmount(w)} USDT`} />
      <Row
        label="Available"
        value={<span className="font-semibold text-gold-300">{formatAmount(c - w)} USDT</span>}
      />
    </div>
  );
}

/** Brings V2 positions across. Migration is one-way and can be closed for good. */
function MigrationAdmin({
  protocol,
  onDone,
}: {
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [user, setUser] = useState("");
  const [amount, setAmount] = useState("");
  const [startTime, setStartTime] = useState("");
  const tx = useContractTx(onDone);

  const open = protocol.migrationOpen !== false;

  return (
    <Section
      title="V2 migration"
      description="Recreates a position from the previous contract. Rewards start accruing again at the migration block, so an old start date cannot pay out yield for time that was never staked here."
      action={open ? <Badge tone="good">Open</Badge> : <Badge tone="neutral">Closed</Badge>}
    >
      <Row label="Migrated so far" value={`${formatAmount(protocol.totalMigrated)} USDT`} />

      <div className={`mt-4 space-y-3 ${open ? "" : "pointer-events-none opacity-50"}`}>
        <input
          className="input font-mono text-sm"
          placeholder="User address (0x…)"
          value={user}
          onChange={(e) => setUser(e.target.value.trim())}
          aria-label="User address"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="input"
            inputMode="decimal"
            placeholder="Amount (USDT)"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-label="Amount"
          />
          <input
            className="input"
            inputMode="numeric"
            placeholder="Original start (unix)"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value.replace(/[^0-9]/g, ""))}
            aria-label="Original start timestamp"
          />
        </div>
        <button
          className="btn-primary w-full"
          disabled={
            user.length !== 42 || !amount || !startTime || tx.isPending || tx.isConfirming
          }
          onClick={() => tx.call("migrateStake", [user, parseUnits6(amount), BigInt(startTime)])}
        >
          Migrate position
        </button>
      </div>

      <button
        className="btn-secondary mt-3 w-full"
        disabled={!open || tx.isPending || tx.isConfirming}
        onClick={() => tx.call("closeMigration")}
      >
        Close migration permanently
      </button>
      <p className="mt-2 text-xs text-graphite-400">
        Closing this is permanent. Migrated positions are recorded at full value with no deposit
        fee, since they were already charged once on the old contract.
      </p>
      <TxStatus {...tx} />
    </Section>
  );
}

/**
 * Funded promotional positions.
 *
 * `grantStake` credits a stake without a transferFrom, so the collateral has to
 * already be in the contract. That is the whole point: a grant spends budget
 * the owner put in, never other depositors' principal.
 */
function GrantAdmin({
  protocol,
  onDone,
}: {
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [user, setUser] = useState("");
  const [amount, setAmount] = useState("");
  const tx = useContractTx(onDone);

  return (
    <Section
      title="Promotional grants"
      description="Opens a position paid for with collateral the owner has already deposited, rather than out of other stakers' capital."
    >
      <Row label="Granted so far" value={`${formatAmount(protocol.totalGranted)} USDT`} />
      <Row label="Free stakes used" value={`${(protocol.freeStakeCount ?? 0n).toString()} / ${(protocol.maxFreeStakes ?? 0n).toString()}`} />

      <div className="mt-4 space-y-3">
        <input
          className="input font-mono text-sm"
          placeholder="Recipient address (0x…)"
          value={user}
          onChange={(e) => setUser(e.target.value.trim())}
          aria-label="Recipient address"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input"
            inputMode="decimal"
            placeholder="Amount (USDT)"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-label="Grant amount"
          />
          <button
            className="btn-primary shrink-0"
            disabled={user.length !== 42 || !amount || tx.isPending || tx.isConfirming}
            onClick={() => tx.call("grantStake", [user, parseUnits6(amount)])}
          >
            Grant
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-graphite-400">
        Deposit the collateral first. The transaction reverts if the pool cannot cover the grant,
        which is what stops a grant from quietly turning into a claim on someone else&apos;s
        deposit.
      </p>
      <TxStatus {...tx} />
    </Section>
  );
}

/**
 * The USDC.e swap layer.
 *
 * Polymarket settles in USDC.e, the pool holds USDT — so a position cannot be
 * opened without crossing that boundary first. `MIN_SWAP_OUTPUT_BPS` bounds the
 * slippage the contract will tolerate; the field below is the per-call minimum
 * on top of it.
 */
function SwapAdmin({
  protocol,
  onDone,
}: {
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [inAmount, setInAmount] = useState("");
  const [minOut, setMinOut] = useState("");
  const tx = useContractTx(onDone);

  const units = (() => {
    try {
      return parseUnits6(inAmount || "0");
    } catch {
      return 0n;
    }
  })();
  const minUnits = (() => {
    try {
      return parseUnits6(minOut || "0");
    } catch {
      return 0n;
    }
  })();

  // 0.5% below the input is a sane starting point on a stable/stable pair at
  // the 0.01% tier; the operator can tighten it.
  const suggested = units > 0n ? formatAmount((units * 9950n) / 10000n, 6) : "";

  return (
    <Section
      title="Strategy token swap"
      description="Polymarket settles in USDC.e while the pool is held in USDT. This is the only place collateral crosses between the two."
      action={
        <Badge tone="volt">{formatAmount(protocol.arbitrageTokenBalance)} USDC.e held</Badge>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="swapin">
            Amount in
          </label>
          <input
            id="swapin"
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={inAmount}
            onChange={(e) => setInAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div>
          <label className="label" htmlFor="swapmin">
            Minimum out
          </label>
          <input
            id="swapmin"
            className="input"
            inputMode="decimal"
            placeholder={suggested || "0.00"}
            value={minOut}
            onChange={(e) => setMinOut(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          {suggested && !minOut && (
            <button
              type="button"
              className="btn-ghost mt-1.5 px-0 text-xs"
              onClick={() => setMinOut(suggested.replace(/,/g, ""))}
            >
              Use {suggested} (0.5% tolerance)
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn-volt"
          disabled={units === 0n || minUnits === 0n || tx.isPending || tx.isConfirming}
          onClick={() => tx.call("swapToArbitrageToken", [units, minUnits])}
        >
          USDT → USDC.e
        </button>
        <button
          className="btn-secondary"
          disabled={units === 0n || minUnits === 0n || tx.isPending || tx.isConfirming}
          onClick={() => tx.call("swapFromArbitrageToken", [units, minUnits])}
        >
          USDC.e → USDT
        </button>
      </div>
      <p className="mt-3 text-xs text-graphite-400">
        The contract additionally enforces its own floor of{" "}
        {protocol.isLoading ? "…" : "99%"} on every swap, so a zero or careless minimum still cannot
        be routed through a drained pool.
      </p>
      <TxStatus {...tx} />
    </Section>
  );
}

function ArbitrageAdmin({
  protocol,
  onDone,
}: {
  protocol: ReturnType<typeof useProtocol>;
  onDone: () => void;
}) {
  const [conditionId, setConditionId] = useState("");
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const tx = useContractTx(onDone);

  const partition = [1n, 2n];
  const validCondition = /^0x[0-9a-fA-F]{64}$/.test(conditionId);
  const amountUnits = (() => {
    try {
      return parseUnits6(amount || "0");
    } catch {
      return 0n;
    }
  })();

  return (
    <Section
      title="Polymarket arbitrage"
      description="Collateral becomes outcome tokens held by the contract. Nothing here sends it to a wallet."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-sm text-graphite-300">Deployed</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatAmount(protocol.arbitrageDeployed)}
          </p>
        </div>
        <div>
          <p className="text-sm text-graphite-300">Ceiling</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatAmount(protocol.arbitrageCeiling)}
          </p>
        </div>
        <div>
          <p className="text-sm text-graphite-300">Available now</p>
          <p className="mt-1 text-xl font-bold text-gold-400">
            {formatAmount(protocol.arbitrageAvailable)}
          </p>
        </div>
        <div>
          <p className="text-sm text-graphite-300">Realized profit</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatAmount(protocol.arbitrageProfit)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cond">
            Condition ID
          </label>
          <input
            id="cond"
            className="input font-mono text-xs"
            placeholder="0x… (32 bytes)"
            value={conditionId}
            onChange={(e) => setConditionId(e.target.value.trim())}
          />
          {conditionId && !validCondition && (
            <p className="mt-1.5 text-xs text-danger-400">Must be a 32-byte hex value.</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="arbamount">
            Amount (USDT)
          </label>
          <input
            id="arbamount"
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          {amountUnits > (protocol.arbitrageAvailable ?? 0n) && (
            <p className="mt-1.5 text-xs text-danger-400">Exceeds the available allowance.</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={
            !validCondition ||
            amountUnits === 0n ||
            amountUnits > (protocol.arbitrageAvailable ?? 0n) ||
            Boolean(protocol.emergencyMode) ||
            Boolean(protocol.paused) ||
            tx.isPending
          }
          onClick={() => tx.call("executePolymarketSplit", [conditionId, partition, amountUnits])}
        >
          Split
        </button>
        <button
          className="btn-secondary"
          disabled={!validCondition || amountUnits === 0n || tx.isPending}
          onClick={() => tx.call("executePolymarketMerge", [conditionId, partition, amountUnits])}
        >
          Merge
        </button>
        <button
          className="btn-secondary"
          disabled={!validCondition || tx.isPending}
          onClick={() => tx.call("executePolymarketRedeem", [conditionId, partition])}
        >
          Redeem
        </button>
      </div>
      <p className="mt-2 text-xs text-graphite-400">
        Split is blocked while the protocol is paused or in emergency mode. Merge and redeem keep
        working so positions can always be unwound and stakers paid.
      </p>

      <div className="mt-6 border-t border-white/[.07] pt-5">
        <label className="label" htmlFor="profit">
          Return external profit to the pool (USDT)
        </label>
        <div className="flex gap-2">
          <input
            id="profit"
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={profit}
            onChange={(e) => setProfit(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          <button
            className="btn-primary shrink-0"
            disabled={!profit || tx.isPending}
            onClick={() => tx.call("depositArbitrageProfit", [parseUnits6(profit)])}
          >
            Deposit
          </button>
        </div>
        <p className="mt-1.5 text-xs text-graphite-400">
          Needs an ERC-20 approval from the owner wallet first. It credits the measured balance
          change, so a fee-on-transfer token cannot inflate the budget.
        </p>
      </div>

      <TxStatus {...tx} />
    </Section>
  );
}

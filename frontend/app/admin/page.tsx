"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractTx, TxStatus } from "@/components/TxButton";
import { AddressLink, Alert, Badge, Countdown, Row, Section } from "@/components/ui";
import { useGovernance, useProtocol } from "@/lib/hooks";
import { formatAmount, formatBps, parseUnits6 } from "@/lib/contract";

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
      <div className="py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Owner console</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-300">
          Connect the owner wallet to manage the protocol.
        </p>
        <div className="mt-8 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!gov.isOwner) {
    return (
      <div className="space-y-6 py-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">Owner console</h1>
        <Alert tone="neutral" title="This wallet is not the contract owner">
          The owner is <AddressLink address={gov.owner} />. Every action on this page is gated
          on-chain, so a non-owner wallet cannot change anything here regardless of what the
          interface shows.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-white">Owner console</h1>
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

      <ArbitrageAdmin protocol={protocol} onDone={refresh} />
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
      description="Pausing suspends staking and claims. Early exit always stays available to stakers."
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
        <p className="mt-3 text-xs text-amber-400">
          Unpause is blocked while emergency mode is active — otherwise the owner could close the
          stakers&apos; escape hatch.
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
          {full && <p className="mt-1.5 text-xs text-amber-400">All partner slots are filled.</p>}
        </div>

        <div className="mt-5 space-y-2">
          {partners.length === 0 ? (
            <p className="text-sm text-ink-400">No partners registered yet.</p>
          ) : (
            partners.map((p, i) => (
              <div
                key={p}
                className="flex items-center justify-between rounded-xl border border-white/[.07] px-3 py-2"
              >
                <AddressLink address={p} />
                <button
                  className="text-xs text-red-400 hover:text-red-300"
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

      <p className="mt-4 text-xs text-ink-400">
        Removal uses swap-and-pop, so the remaining partners may change index. The list above always
        reflects current on-chain order.
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
              <span className="text-amber-400">Ready</span>
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
          <p className="mt-1.5 text-xs text-amber-400">
            Frozen while rescue votes are outstanding — the destination cannot be changed under a
            vote already cast.
          </p>
        )}
      </div>

      <button
        className="btn-primary mt-4 w-full bg-amber-500 hover:bg-amber-400"
        disabled={!gov.rescueReady || tx.isPending || tx.isConfirming}
        onClick={() => tx.call("executeRescue")}
      >
        Execute rescue — sweep {formatAmount(protocol.balance)} USDT
      </button>
      <p className="mt-2 text-xs text-ink-400">
        Requires partner quorum plus the full 7-day delay. Stakers&apos; own no-penalty withdrawals
        open five days earlier.
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
            <p className="mt-1.5 text-xs text-red-400">
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
      <p className="mt-3 text-xs text-ink-400">
        A blocked address keeps access to early exit and emergency withdrawal, so principal is never
        trapped. Unclaimed yield is inaccessible while blocked.
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
      description="Collateral converts into contract-held outcome tokens. No path sends it to a wallet."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-sm text-ink-300">Deployed</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatAmount(protocol.arbitrageDeployed)}
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-300">Ceiling</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatAmount(protocol.arbitrageCeiling)}
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-300">Available now</p>
          <p className="mt-1 text-xl font-bold text-brand-400">
            {formatAmount(protocol.arbitrageAvailable)}
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-300">Realized profit</p>
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
            <p className="mt-1.5 text-xs text-red-400">Must be a 32-byte hex value.</p>
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
            <p className="mt-1.5 text-xs text-red-400">Exceeds the available allowance.</p>
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
      <p className="mt-2 text-xs text-ink-400">
        Split is blocked while paused or in emergency mode. Merge and redeem stay available so
        positions can always be unwound for stakers.
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
        <p className="mt-1.5 text-xs text-ink-400">
          Requires an ERC-20 approval from the owner wallet first. Credits the measured balance
          delta, so a fee-on-transfer token cannot inflate the budget.
        </p>
      </div>

      <TxStatus {...tx} />
    </Section>
  );
}

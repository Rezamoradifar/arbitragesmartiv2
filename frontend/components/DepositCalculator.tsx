"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Row, Skeleton } from "@/components/ui";
import { useDepositQuote } from "@/lib/hooks";
import {
  MAX_STAKE_UNITS,
  MIN_STAKE_UNITS,
  PENALTY_SCHEDULE,
  PLANS,
  claimFeeBpsFor,
  formatAmount,
  grossForNet,
  parseUnits6,
  planForAmount,
} from "@/lib/contract";

/**
 * What a deposit actually buys, before anyone connects a wallet.
 *
 * The figures come from quoteDeposit on the contract rather than from a
 * formula copied into the front end, so this cannot drift from what the
 * deposit will really do. Only the yield projection is computed here, from
 * the plan table — the contract has no view for it.
 *
 * The reason it exists: the entry fee comes off before the stake is recorded,
 * which means the number people type is not the number they earn on, and the
 * smallest deposit that works is not the advertised 10 USDT. Both of those
 * surprise people at the moment they sign, which is the worst possible moment.
 */

const PRESETS = [50, 500, 2_500, 10_000];
const MIN_GROSS = grossForNet(10);

export function DepositCalculator() {
  const [amount, setAmount] = useState("500");

  const units = useMemo(() => {
    try {
      return parseUnits6(amount || "0");
    } catch {
      return 0n;
    }
  }, [amount]);

  const quote = useDepositQuote(units);
  const netStake = quote.netStake;
  const planIndex = planForAmount(netStake ?? 0n);
  const plan = PLANS[planIndex];

  const belowMin = units > 0n && netStake !== undefined && netStake < MIN_STAKE_UNITS;
  const aboveMax = units > MAX_STAKE_UNITS;

  // Yield is simple, not compounded: the contract accrues on the recorded
  // principal alone, so a projection that compounds would overstate it.
  const net = netStake === undefined ? 0 : Number(netStake) / 1e6;
  const daily = (net * (plan?.dailyBps ?? 0)) / 10_000;
  const gross = daily * (plan?.durationDays ?? 0);
  const claimFeeBps = claimFeeBpsFor(planIndex);
  const afterClaimFee = gross * (1 - claimFeeBps / 10_000);

  const ready = units > 0n && netStake !== undefined && !belowMin && !aboveMax;

  /*
   * What it would take to reach the next tier.
   *
   * Every round number lands one tier lower than people expect, because the
   * tier is read off the stake after the fee: 500 records 450 and stays on
   * Starter, 10,000 records 9,500 and stays on Advanced. Someone who deposits
   * 10,000 for the Elite rate and gets Advanced has been misled by arithmetic
   * nobody showed them, and by then it is a transaction they cannot undo.
   */
  const nextPlan = PLANS[planIndex + 1];
  const nextTierGross = nextPlan ? grossForNet(nextPlan.minStake) : null;
  const shortfall =
    nextTierGross !== null && ready ? nextTierGross - Number(units) / 1e6 : null;

  return (
    <div className="glass p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="font-display text-xl font-semibold text-white">What a deposit buys</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">
          Read live from the contract. The entry fee comes off before your stake is recorded, so
          the amount you send is not the amount you earn on.
        </p>
      </div>

      <label className="label" htmlFor="calc-amount">
        Deposit amount (USDT)
      </label>
      <div className="relative">
        <input
          id="calc-amount"
          className="input pr-16 font-display text-lg font-semibold"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="500"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-graphite-400">
          USDT
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className="rounded-full border border-white/[.08] bg-white/[.02] px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-400/25 hover:text-gold-300"
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      {belowMin && (
        <div className="mt-5">
          <Alert tone="warn" title={`Below the minimum — this deposit would be rejected`}>
            The contract requires 10 USDT to remain after the entry fee, so the smallest deposit
            that works is {MIN_GROSS.toFixed(2)} USDT. Sending exactly 10 fails.
          </Alert>
        </div>
      )}
      {aboveMax && (
        <div className="mt-5">
          <Alert tone="warn" title="Above the maximum">
            A single stake is capped at 25,000 USDT.
          </Alert>
        </div>
      )}

      {units > 0n && quote.isLoading && <Skeleton className="mt-6 h-40 w-full" />}

      {ready && (
        <>
          <div className="mt-6 space-y-1 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <Row label="You send" value={`${formatAmount(units)} USDT`} />
            <Row
              label={`Entry fee (${Number(quote.feeBps ?? 0n) / 100}%)`}
              value={`−${formatAmount(quote.totalFee)} USDT`}
            />
            <Row
              label="Recorded as your stake"
              value={<span className="text-gold-300">{formatAmount(netStake)} USDT</span>}
            />
          </div>

          <div className="mt-4 space-y-1 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <Row label="Plan" value={`${plan.name} · ${plan.durationDays} days`} />
            {nextPlan && nextTierGross !== null && shortfall !== null && shortfall > 0 && (
              <p className="pt-1 text-xs leading-relaxed text-graphite-400">
                {nextPlan.name} starts at {nextPlan.minStake.toLocaleString()} USDT{" "}
                <span className="text-graphite-500">recorded</span>, so it needs{" "}
                <button
                  type="button"
                  onClick={() => setAmount(nextTierGross.toFixed(2))}
                  className="font-semibold text-gold-300 underline underline-offset-2"
                >
                  {nextTierGross.toFixed(2)} USDT
                </button>{" "}
                sent — {shortfall.toFixed(2)} more than this.
              </p>
            )}
            <Row label="Daily rate" value={`${(plan.dailyBps / 100).toFixed(2)}%`} />
            <Row label="Yield per day" value={`${daily.toFixed(4)} USDT`} />
            <Row label={`Yield over ${plan.durationDays} days`} value={`${gross.toFixed(2)} USDT`} />
            <Row
              label={`After the ${claimFeeBps / 100}% claim fee`}
              value={<span className="text-gold-300">{afterClaimFee.toFixed(2)} USDT</span>}
            />
          </div>

          {/* The part most calculators leave out. Someone deciding whether to
              deposit is also deciding whether they can leave it alone, and
              that answer costs real money in the first weeks. */}
          <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-graphite-400">
              If you exit early
            </p>
            <p className="mt-2 text-xs leading-relaxed text-graphite-400">
              Exit is open at any time and needs nobody&apos;s approval, but it is not free. The
              penalty comes off your{" "}
              <span className="text-graphite-200">{formatAmount(netStake)} USDT principal</span>,
              and any yield you have not already claimed is lost on top of it:
            </p>
            <div className="mt-3 space-y-1">
              {PENALTY_SCHEDULE.map((p) => (
                <Row key={p.label} label={p.label} value={`−${p.bps / 100}% of principal · you get ${formatAmount((netStake * BigInt(10_000 - p.bps)) / 10_000n)} USDT`} />
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-graphite-500">
            Yield is simple, not compounded, and accrues on the recorded stake alone. These rates
            are settings compiled into the contract, not a forecast — what it can pay depends on
            the strategy performing and on the contract holding enough to pay it.
          </p>

          <Link href="/dashboard" className="btn-primary mt-5 inline-block">
            Open a position
          </Link>
        </>
      )}
    </div>
  );
}

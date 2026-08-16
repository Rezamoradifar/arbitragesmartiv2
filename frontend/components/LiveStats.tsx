"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Badge, Progress, StatCard } from "@/components/ui";
import { LiveDot } from "@/components/Aurora";
import { Icon } from "@/components/Icon";

function useSecondsSince(timestamp: number | undefined) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return undefined;
  return Math.max(0, Math.round((Date.now() - timestamp) / 1000));
}

export function LiveStats() {
  const p = useProtocol();
  const [lastUpdated, setLastUpdated] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!p.isLoading) setLastUpdated(Date.now());
  }, [p.isLoading, p.totalAssets, p.totalStaked, p.totalPaidOut]);
  const secondsAgo = useSecondsSince(lastUpdated);

  const deployed = p.arbitrageDeployed ?? 0n;
  const assets = p.totalAssets ?? 0n;
  const deployedPct = assets > 0n ? Number((deployed * 10000n) / assets) / 100 : 0;

  const items = [
    {
      label: "Total value locked",
      value: p.totalAssets,
      sub: "Liquid plus deployed, after unswept fees",
      lead: true,
      icon: "layers" as const,
    },
    {
      label: "Principal staked",
      value: p.totalStaked,
      sub: "Across all active positions",
      icon: "wallet" as const,
    },
    {
      label: "Paid out to stakers",
      value: p.totalPaidOut,
      sub: "Lifetime yield claimed",
      icon: "arrowDown" as const,
    },
    {
      label: "Realized strategy profit",
      value: p.arbitrageProfit,
      // Only profit actually received in collateral is ever counted here, so
      // this reads 0 until a position is genuinely closed at a gain — which it
      // never has. That zero is the most consequential figure on the page, and
      // it raises a question the visitor deserves an answer to rather than an
      // assumption about, so it links to one instead of being softened.
      sub:
        (p.arbitrageProfit ?? 0n) === 0n ? (
          <>
            Nothing realised yet.{" "}
            <Link href="/strategy" className="text-gold-300 underline underline-offset-2">
              Why, and where the yield comes from
            </Link>
          </>
        ) : (
          "After the performance fee, credited to the pool"
        ),
      icon: "zap" as const,
    },
  ];

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">
            <LiveDot />
            Live on-chain
          </span>
          <h2 className="h-section mt-4">Protocol at a glance</h2>
          {secondsAgo !== undefined && (
            <p className="mt-2 text-xs text-graphite-400">
              Read straight from the contract · updated {secondsAgo}s ago
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.emergencyMode ? (
            <Badge tone="bad">Emergency mode</Badge>
          ) : p.paused ? (
            <Badge tone="warn">Paused</Badge>
          ) : (
            <Badge tone="good">Operating normally</Badge>
          )}
          {p.userCount !== undefined && (
            <Badge tone="neutral">{p.userCount.toString()} participants</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <StatCard
            key={it.label}
            label={it.label}
            lead={it.lead}
            loading={p.isLoading}
            icon={<Icon name={it.icon} className="h-5 w-5" />}
            value={
              <>
                {formatAmount(it.value)}
                <span className="ml-1.5 text-base font-semibold text-graphite-400">USDT</span>
              </>
            }
            sub={it.sub}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StrategyCapacity
          deployed={deployed}
          ceiling={p.arbitrageCeiling}
          liquid={p.balance}
          deployedPct={deployedPct}
          staked={p.totalStaked}
          paidOut={p.totalPaidOut}
          realizedProfit={p.arbitrageProfit}
        />
        <BalanceSheet p={p} />
      </div>
    </section>
  );
}

/**
 * Strategy capacity. When nothing is deployed the honest reading is "no open
 * positions", not a bare zero — a lone 0 reads as broken rather than idle, and
 * the distinction matters to someone deciding whether to stake.
 */
function StrategyCapacity({
  deployed,
  ceiling,
  liquid,
  deployedPct,
  staked,
  paidOut,
  realizedProfit,
}: {
  deployed: bigint;
  ceiling?: bigint;
  liquid?: bigint;
  deployedPct: number;
  staked?: bigint;
  paidOut?: bigint;
  realizedProfit?: bigint;
}) {
  /*
   * Coverage: what the contract holds against what it owes stakers.
   *
   * This panel used to end after the capacity bar and leave half its height
   * empty next to the balance sheet. What belongs in that space is the one
   * figure a careful visitor is actually looking for and that a Ponzi cannot
   * show, because its number does not add up. It is read from the same
   * contract call as everything else, so it stays true or it stops saying
   * 100% — either way nobody has to take our word for it.
   */
  const owed = staked ?? 0n;
  const held = (liquid ?? 0n) + deployed;
  const coverage = owed > 0n ? Number((held * 10000n) / owed) / 100 : null;
  const fullyCovered = coverage !== null && coverage >= 100;

  /*
   * A red bar with no figure beside it is worse than the number it is hiding.
   * "Holds less than it owes" could mean a dollar or half the pool, so a
   * reader supplies the worst case — and the gap here has a precise size and
   * a precise cause, both of which are less alarming than the guess.
   *
   * The cause is not a mystery to be investigated: yield has been claimed
   * while realized strategy profit is zero, so it was paid out of deposited
   * capital. There is nowhere else it could have come from. Saying that
   * plainly is the difference between a warning and an accusation the reader
   * makes on our behalf.
   *
   * `totalStaked` counts funded stake only — `stake()` runs
   * `if (!free) totalStaked += amount`, so launch giveaways are never in this
   * figure and the gap is real money, not an accounting artefact.
   */
  const shortfall = owed > held ? owed - held : 0n;
  const yieldPaid = paidOut ?? 0n;
  const profit = realizedProfit ?? 0n;
  // Only claim the gap IS the paid-out yield when the arithmetic actually
  // says so; otherwise state both figures and let them speak.
  const gapIsPaidYield = shortfall > 0n && profit === 0n && yieldPaid >= shortfall;

  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-graphite-100">Strategy capital deployed</p>
        <p className="text-sm tabular-nums text-graphite-300">
          {deployed === 0n ? (
            <Badge tone="neutral">No open positions</Badge>
          ) : (
            <>
              <span className="font-semibold text-white">{formatAmount(deployed)}</span>
              <span className="text-graphite-400"> / {formatAmount(ceiling)} USDT ceiling</span>
            </>
          )}
        </p>
      </div>
      <div className="mt-4">
        <Progress
          value={Number(deployed / 1_000000n)}
          max={Math.max(1, Number((ceiling ?? 1n) / 1_000000n))}
          tone={deployedPct > 18 ? "warn" : "volt"}
        />
      </div>
      <p className="mt-3.5 text-xs leading-relaxed text-graphite-400">
        {deployed === 0n ? (
          <>
            Every staked dollar is liquid right now, with nothing committed to a position. The
            contract can commit at most{" "}
            <span className="text-graphite-200">{formatAmount(ceiling)} USDT</span> (20% of assets);
            the rest can never leave the withdrawal buffer.
          </>
        ) : (
          <>
            Capped cumulatively at 20% of total assets plus realized profit. The remaining{" "}
            <span className="text-graphite-200">{formatAmount(liquid)} USDT</span> stays liquid for
            withdrawals.
          </>
        )}
      </p>

      {coverage !== null && (
        <div className="mt-5 border-t border-white/[.07] pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-graphite-100">Coverage of staker principal</p>
            <p
              className={`font-display text-2xl font-bold tabular-nums ${
                fullyCovered ? "text-volt-300" : "text-danger-400"
              }`}
            >
              {coverage.toFixed(coverage % 1 === 0 ? 0 : 1)}%
            </p>
          </div>
          <div className="mt-3">
            <Progress value={Math.min(coverage, 100)} max={100} tone={fullyCovered ? "good" : "bad"} />
          </div>
          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-graphite-400">Held by the contract</dt>
              <dd className="tabular-nums text-graphite-200">{formatAmount(held)} USDT</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-graphite-400">Owed to stakers as principal</dt>
              <dd className="tabular-nums text-graphite-200">{formatAmount(owed)} USDT</dd>
            </div>
          </dl>
          {!fullyCovered && shortfall > 0n && (
            <div className="mt-2 flex justify-between border-t border-white/[.06] pt-2 text-xs">
              <dt className="font-semibold text-danger-400">Short by</dt>
              <dd className="tabular-nums font-semibold text-danger-400">
                {formatAmount(shortfall)} USDT
              </dd>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-graphite-400">
            {fullyCovered ? (
              "Every dollar of principal is backed right now. Read from the contract at this block, not from a report — check it yourself on Polygonscan."
            ) : gapIsPaidYield ? (
              <>
                <span className="text-graphite-200">Where the gap came from:</span>{" "}
                {formatAmount(yieldPaid)} USDT has been claimed as yield while realized strategy
                profit is <span className="text-graphite-200">zero</span> — so it was paid out of
                deposited capital, because there was nowhere else for it to come from. That is this
                gap. It is not a loss, a fee or a withdrawal by anyone; it is yield paid before
                anything earned it. Sending {formatAmount(shortfall)} USDT to the contract restores
                full coverage, and this figure is read live, so it would say so.
              </>
            ) : (
              "The contract currently holds less than the principal it owes. This is shown rather than hidden; ask us about it before depositing."
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The V3 balance sheet.
 *
 * Deposit fees are held in the same contract as pool capital, so the only way
 * "TVL" means anything is if the two are shown apart. `dashboard()` returns
 * both sides from one call, and `totalAssets()` already subtracts unswept fees
 * — this panel just makes that subtraction visible instead of implied.
 */
function BalanceSheet({ p }: { p: ReturnType<typeof useProtocol> }) {
  const rows: Array<{ label: string; value?: bigint; tone?: "gold" }> = [
    { label: "Gross deposits received", value: p.grossDeposits },
    { label: "Development & promotion fees", value: p.developmentFees, tone: "gold" },
    { label: "Recorded as user stakes", value: p.userNetStakes },
    { label: "Liquid in the main pool", value: p.mainPoolBalance },
    { label: "Deployed to strategy", value: p.deployedToArbitrage },
  ];

  return (
    <div className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-graphite-100">Where the money sits</p>
        <Badge tone="brand">12–5% deposit fee</Badge>
      </div>

      <dl className="mt-4 space-y-0">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-4 border-b border-white/[.05] py-2.5 last:border-0"
          >
            <dt className="shrink-0 text-sm text-graphite-300">{r.label}</dt>
            <dd
              className={`min-w-0 break-words text-right text-sm font-medium tabular-nums ${
                r.tone === "gold" ? "text-gold-300" : "text-graphite-50"
              }`}
            >
              {formatAmount(r.value)} USDT
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3.5 text-xs leading-relaxed text-graphite-400">
        The deposit fee falls with size — 12% under 500 USDT, 5% from 10,000 — and the exact split
        is shown before you sign. Fees are counted separately and subtracted from total assets, so
        fee income never gets mistaken for pool capital or withdrawn as though it were.
      </p>
    </div>
  );
}

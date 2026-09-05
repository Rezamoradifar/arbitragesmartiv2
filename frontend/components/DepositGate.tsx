"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui";
import { PENALTY_SCHEDULE, PLANS, REFERRAL_DEDUCTION_MAX_BPS } from "@/lib/contract";

/**
 * The acknowledgements a deposit waits behind.
 *
 * WHY THIS IS ON THE DEPOSIT SIDE AND NOT THE PAYOUT SIDE
 *
 * `claim()` is a public function on a verified contract. Anyone can call it
 * straight from a block explorer, so a front end cannot gate what leaves —
 * only what arrives. That is not a limitation to work around; the deposit is
 * the only side where a condition means anything, and it happens to be the
 * side that creates the liability in the first place. Every dollar in commits
 * roughly three and a half dollars out, so slowing the entrance is the one
 * lever the interface genuinely has.
 *
 * Each line states something the contract does that people get wrong, in the
 * words they would use afterwards if nobody had told them. They read as one
 * block behind a single checkbox — five separate boxes was friction without
 * changing what anyone actually reads, and this only shows once per browser
 * anyway (STORAGE_KEY below).
 *
 * The point is not paperwork. Someone who reads this and still deposits has
 * made a decision; someone who was shown a rate and a button has not, and is
 * the person who later says they were not told.
 */

const STORAGE_KEY = "arbismart-ack-v2";

function summaryText() {
  const worstPenalty = PENALTY_SCHEDULE[0].bps / 100;
  const endPenalty = PENALTY_SCHEDULE[PENALTY_SCHEDULE.length - 1].bps / 100;
  return (
    `I understand: the ${(PLANS[0].dailyBps / 100).toFixed(2)}%–${(PLANS[3].dailyBps / 100).toFixed(2)}% daily rates are ` +
    `settings written into the contract, not a return anything has earned yet. The early-exit penalty ` +
    `is charged on my principal — up to ${worstPenalty}% in week one, and still ${endPenalty}% even after ` +
    `the full term, so I never get 100% back by exiting. If I joined through a referral link, up to ` +
    `${REFERRAL_DEDUCTION_MAX_BPS / 100}% of my yield goes to the people above me. I am depositing money ` +
    `I can afford to lose entirely.`
  );
}

export function DepositGate({ children }: { children: React.ReactNode }) {
  const summary = summaryText();
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  // Read after mount so the prerendered markup and the first client render
  // agree; reading localStorage during render would mismatch and flash.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Private browsing or storage disabled. The gate simply shows again,
      // which is the safe direction — never the direction that skips it.
    }
    setReady(true);
  }, []);

  function confirm() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* not fatal — the gate just reappears next visit */
    }
    setUnlocked(true);
  }

  // Whether the gate has already been passed is only knowable on the client,
  // so the first paint cannot know which of the two to show. A skeleton holds
  // the space rather than collapsing it — returning null here dropped the card
  // out of the layout for a frame and everything below it jumped.
  if (!ready) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (unlocked) return <>{children}</>;

  return (
    <div className="glass p-6 sm:p-8">
      <h3 className="font-display text-lg font-semibold text-white">
        Before you deposit, what the rate does not tell you
      </h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-graphite-300">
        Every part of this is in the contract and verifiable on-chain.{" "}
        <Link href="/strategy" className="text-gold-400 underline underline-offset-2 hover:text-gold-300">
          Full arithmetic here
        </Link>{" "}
        if you want it broken down line by line.
      </p>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-4 transition hover:border-gold-400/25">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[rgb(224_173_60)]"
        />
        <span className="text-sm leading-relaxed text-graphite-200">{summary}</span>
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={!checked} onClick={confirm}>
          I understand — continue
        </button>
      </div>

      {!checked && (
        <p className="mt-3 text-xs text-graphite-500">
          If any part of this is something you would rather not agree to, that is a reason not to
          deposit, not a box to skip.
        </p>
      )}
    </div>
  );
}

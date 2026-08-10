import type { Metadata } from "next";
import { GovernanceSnapshot } from "@/components/GovernanceSnapshot";
import { SecurityVisual, VerificationVisual } from "@/components/visuals/FeatureVisuals";
import { VisualFrame } from "@/components/visuals/primitives";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Exactly what the owner can and cannot do with staked funds, and the on-chain checks that enforce it.",
};

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

const canDo = [
  {
    title: "Take a disclosed fee on every deposit",
    body: "Two development wallets each receive 5% of a deposit — 10% in total — before the stake is recorded. The deposit screen shows the exact split before you sign, your stake is credited net, and the rate is immutable: it is set at deployment and there is no function to raise it.",
  },
  {
    title: "Collect protocol fees on claims",
    body: "10% of every yield claim goes to two fee wallets, and a capped share of realized strategy profit goes to a profit recipient. The owner sets those addresses. This is the business model, and it is bounded by the contract.",
  },
  {
    title: "Deploy up to 20% into Polymarket",
    body: "Collateral converts into outcome tokens held by the contract itself. It never reaches a wallet. The cap is cumulative against total assets, so repeated deployments cannot walk past it.",
  },
  {
    title: "Pause the protocol",
    body: "Suspends staking and yield claims. Early exit stays open throughout, so nobody is locked in.",
  },
  {
    title: "Blacklist an address",
    body: "Blocks new stakes and claims. It cannot block early exit or emergency withdrawal — principal is never trapped. Accrued yield is inaccessible while blocked, which is the one genuine cost.",
  },
];

const cannotDo = [
  {
    title: "Withdraw principal to a wallet",
    body: "No such function exists. The only transfers out are: to the staker who earned them, to the fee wallets for fees already charged, and the capped profit fee. There is no percentage-of-pool withdrawal, at any size, under any label.",
  },
  {
    title: "Spend the fee balance as if it were pool capital",
    body: "Collected fees are tracked separately and subtracted inside totalAssets(), so platform revenue never counts toward the pool it is drawn from, and withdrawing a fee cannot touch a staker's principal.",
  },
  {
    title: "Raise the deposit fee after you deposit",
    body: "Both fee rates are immutable constructor parameters with a hard 20% ceiling enforced at deployment. The rate you were quoted is the rate the contract will always charge.",
  },
  {
    title: "Bill principal as profit",
    body: "The performance fee is charged only on the surplus over tracked principal, and the tracker is retired by the amount actually recovered — so splitting a redemption across calls cannot manufacture fake profit.",
  },
  {
    title: "Sweep funds without partners and a delay",
    body: "Fund rescue needs three of five votes plus a 48-hour on-chain delay, and the destination is frozen while any vote is outstanding.",
  },
  {
    title: "Override a partner vote",
    body: "The owner holds one vote of five, cannot unpause out of emergency mode, and cannot add or remove partners while a vote is live.",
  },
];

const limitations = [
  {
    title: "The owner is a single key, not a multisig",
    body: "The contract accepts a Gnosis Safe or a timelock as owner with no code change, and that would be stronger. The partner voting body is the mitigation currently in place.",
  },
  {
    title: "Order-book arbitrage is not autonomous",
    body: "Polymarket's exchange is operator-gated, so the contract can only split, merge, and redeem after resolution. Continuous buy-low/sell-high would need an off-chain component that is deliberately not implemented.",
  },
  {
    title: "Staking economics are not a guarantee",
    body: "The advertised daily rates are contract parameters, not a yield the protocol has proven it can sustain. Yield is simple, never compounded, and paying it depends on strategy performance and on inflows.",
  },
  {
    title: "Blacklisting can cost you accrued yield",
    body: "Principal always remains recoverable, but a blocked address cannot claim yield it has already earned.",
  },
];

const bounty = [
  {
    tier: "Critical",
    reward: "$500",
    body: "Any path that moves staked principal to an address other than the staker who owns it — a drain, a theft, an unauthorized sweep.",
  },
  {
    tier: "High",
    reward: "$150",
    body: "Freezing user funds, bypassing a security control (partner quorum, the emergency-withdraw delay, blacklist boundaries), or breaking an accounting invariant.",
  },
  {
    tier: "Medium",
    reward: "$50",
    body: "Incorrect accounting or logic errors that don't directly move funds but could compound into a real issue.",
  },
  {
    tier: "Low / info",
    reward: "Credit",
    body: "Gas inefficiencies, style issues, or anything already listed on this page as a known limitation.",
  },
];

export default function SecurityPage() {
  return (
    <div className="container-page space-y-16 py-10 sm:space-y-20 sm:py-14">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0">
          <p className="eyebrow">
            <Icon name="lock" className="h-3.5 w-3.5" />
            Security model
          </p>
          <h1 className="h-display mt-5">
            What the owner <span className="text-gold-gradient">can</span> and cannot do
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-graphite-300">
            Most staking sites answer this with a promise. Here it is answered by the contract, and
            every claim below is checkable in the verified source.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              className="btn-secondary"
              href={`https://repo.sourcify.dev/137/${CONTRACT}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" className="h-4 w-4" />
              Verified source
            </a>
            <a
              className="btn-ghost"
              href={`https://polygonscan.com/address/${CONTRACT}#code`}
              target="_blank"
              rel="noreferrer"
            >
              Read it on PolygonScan
            </a>
          </div>
        </div>
        <VisualFrame className="hidden lg:block">
          <SecurityVisual />
        </VisualFrame>
      </section>

      <GovernanceSnapshot />

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-warn-400">
            <Icon name="info" className="h-5 w-5" />
            The owner can
          </h2>
          <div className="space-y-3.5">
            {canDo.map((x) => (
              <div key={x.title} className="glass p-5">
                <h3 className="font-display font-semibold text-white">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-success-400">
            <Icon name="shield" className="h-5 w-5" />
            The owner cannot
          </h2>
          <div className="space-y-3.5">
            {cannotDo.map((x) => (
              <div key={x.title} className="glass p-5">
                <h3 className="font-display font-semibold text-white">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="h-section">The race that protects you</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          If the voting body ever moves to sweep the pool, stakers get a 36-hour head start. Both
          timers are enforced on-chain and start from the same vote.
        </p>
        <div className="glass mt-7 p-6 sm:p-8">
          <ol className="space-y-6">
            {[
              {
                day: "Hour 0",
                title: "Quorum reached",
                body: "Three of five vote. The protocol pauses immediately and new strategy deployments stop.",
              },
              {
                day: "Hour 12",
                title: "Your withdrawal opens",
                body: "Emergency withdrawal unlocks for every staker — full principal, no penalty, no permission needed.",
              },
              {
                day: "Hour 48",
                title: "Earliest possible sweep",
                body: "Only now can a rescue execute, and only to the recovery wallet frozen at vote time.",
              },
            ].map((step, i) => (
              <li key={step.day} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
                      i === 1
                        ? "bg-gold-sheen text-graphite-950 shadow-gold"
                        : "border border-white/10 bg-white/[.04] text-graphite-200"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < 2 && <span className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-white/15 to-white/[.03]" />}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-xs font-medium uppercase tracking-[.14em] text-graphite-400">
                    {step.day}
                  </p>
                  <p className="mt-1 font-display font-semibold text-white">{step.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid items-start gap-10 lg:grid-cols-[1fr_.85fr]">
        <div className="min-w-0">
          <h2 className="h-section">Known limitations</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
            Stated plainly, because a security page that only lists strengths is marketing.
          </p>
          <div className="mt-7 space-y-3.5">
            {limitations.map((x) => (
              <div key={x.title} className="glass p-5">
                <h3 className="font-display font-semibold text-white">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
        <VisualFrame className="hidden lg:block lg:mt-24">
          <VerificationVisual />
        </VisualFrame>
      </section>

      <section id="bounty" className="scroll-mt-24">
        <h2 className="h-section">Bug bounty</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Found a real vulnerability? Report it privately before doing anything else, and get paid
          for it. Independently of the automated Slither static-analysis pass and the unit, fork and
          invariant suites already run against this contract, a genuine bug found by a human is
          worth a real reward.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bounty.map((t, i) => (
            <div key={t.tier} className={`glass glass-hover p-5 ${i === 0 ? "glass-gold" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display font-semibold text-white">{t.tier}</h3>
                <span
                  className={`font-display text-lg font-bold ${
                    i === 0 ? "text-gold-gradient" : "text-graphite-100"
                  }`}
                >
                  {t.reward}
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-graphite-300">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="glass mt-4 p-5 sm:p-6">
          <h3 className="font-display font-semibold text-white">How to report</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-graphite-300">
            Email{" "}
            <a
              className="text-gold-300 underline underline-offset-2 hover:text-gold-200"
              href="mailto:EnjoyingEnjoying@gmail.com"
            >
              EnjoyingEnjoying@gmail.com
            </a>{" "}
            with a description and, ideally, a proof-of-concept against a fork — not mainnet. Report
            privately first; public disclosure or on-chain exploitation before a fix ships forfeits
            the reward. First valid report wins if more than one person finds the same issue. Scope
            is the deployed contract at{" "}
            <span className="break-all font-mono text-xs text-graphite-200">{CONTRACT}</span> and
            this frontend; known limitations listed above are out of scope.
          </p>
        </div>
      </section>
    </div>
  );
}

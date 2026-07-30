import type { Metadata } from "next";
import { GovernanceSnapshot } from "@/components/GovernanceSnapshot";

export const metadata: Metadata = {
  title: "Security — ArbiSmart",
  description:
    "Exactly what the owner can and cannot do with staked funds, and the checks that enforce it.",
};

const canDo = [
  {
    title: "Collect protocol fees",
    body: "10% of every yield claim goes to two fee wallets, and a capped share of realized arbitrage profit goes to a profit recipient. The owner sets all three addresses. This is the business model, and it is bounded by the contract.",
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
    body: "No such function exists. The only transfers out are: the staker who earned them, the two fee wallets, and the capped profit fee.",
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

export default function SecurityPage() {
  return (
    <div className="space-y-14 py-6">
      <section>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          What the owner can and cannot do
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-ink-300">
          Most staking sites answer this with a promise. Here it is answered by the contract, and
          every claim below is checkable in the verified source.
        </p>
      </section>

      <GovernanceSnapshot />

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold text-amber-400">The owner can</h2>
          <div className="space-y-4">
            {canDo.map((x) => (
              <div key={x.title} className="card">
                <h3 className="font-semibold text-ink-50">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold text-brand-400">The owner cannot</h2>
          <div className="space-y-4">
            {cannotDo.map((x) => (
              <div key={x.title} className="card">
                <h3 className="font-semibold text-ink-50">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          The race that protects you
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-300">
          If the voting body ever moves to sweep the pool, stakers get a five-day head start. Both
          timers are enforced on-chain and start from the same vote.
        </p>
        <div className="card mt-6">
          <ol className="space-y-5">
            {[
              { day: "Day 0", title: "Quorum reached", body: "Three of five vote. The protocol pauses immediately and new arbitrage deployments stop." },
              { day: "Day 2", title: "Your withdrawal opens", body: "Emergency withdrawal unlocks for every staker — full principal, no penalty, no permission needed." },
              { day: "Day 7", title: "Earliest possible sweep", body: "Only now can a rescue execute, and only to the recovery wallet frozen at vote time." },
            ].map((step, i) => (
              <li key={step.day} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      i === 1 ? "bg-brand-500 text-ink-950" : "bg-ink-800 text-ink-200"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < 2 && <span className="mt-1 h-full w-px flex-1 bg-ink-800" />}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    {step.day}
                  </p>
                  <p className="mt-0.5 font-semibold text-ink-50">{step.title}</p>
                  <p className="mt-1 text-sm text-ink-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight text-white">Known limitations</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-300">
          Stated plainly, because a security page that only lists strengths is marketing.
        </p>
        <div className="mt-6 space-y-4">
          {[
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
              body: "The advertised daily rates are contract parameters, not a yield the protocol has proven it can sustain. Returns depend on arbitrage performance and inflows.",
            },
            {
              title: "Blacklisting can cost you accrued yield",
              body: "Principal always remains recoverable, but a blocked address cannot claim yield it has already earned.",
            },
          ].map((x) => (
            <div key={x.title} className="card">
              <h3 className="font-semibold text-ink-50">{x.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{x.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

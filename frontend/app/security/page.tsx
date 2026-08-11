import type { Metadata } from "next";
import { GovernanceSnapshot } from "@/components/GovernanceSnapshot";
import { SecurityVisual, VerificationVisual } from "@/components/visuals/FeatureVisuals";
import { VisualFrame } from "@/components/visuals/primitives";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Security",
  description:
    "What the owner can and cannot do with staked funds, and the on-chain checks behind each answer.",
};

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

/** Where vulnerability reports go. On the project's own domain, so a
 *  researcher can tell it apart from someone impersonating the project. */
const SECURITY_EMAIL = "security@arbhub.site";

const canDo = [
  {
    title: "Take a disclosed fee on every deposit",
    body: "The fee falls with deposit size: 12% under 500 USDT, 10% from 500, 7% from 2,500, 5% from 10,000. It is split evenly between two development wallets and taken before the stake is recorded, so your stake is credited net. The deposit screen shows the exact split before you sign, and the schedule is compiled into the contract with no function to change it.",
  },
  {
    title: "Collect protocol fees on claims",
    body: "10% of every yield claim goes to two fee wallets, halved to 5% on the Advanced and Elite plans, plus a capped share of any strategy profit. The owner chooses those addresses but the owner address itself receives nothing. This is how the project makes money, and the contract caps how much it can take.",
  },
  {
    title: "Deploy up to 20% into Polymarket",
    body: "The collateral becomes outcome tokens held by the contract. It never lands in anyone's wallet. The 20% cap counts everything already deployed, so it cannot be worked around by deploying repeatedly in smaller amounts.",
  },
  {
    title: "Pause the protocol",
    body: "This stops new stakes and yield claims. Early exit keeps working the whole time, so nobody gets locked in.",
  },
  {
    title: "Blacklist an address",
    body: "This blocks new stakes and claims for one address. It cannot block early exit or emergency withdrawal, so principal is never trapped. What it does cost you is access to yield you have already earned but not claimed.",
  },
];

const cannotDo = [
  {
    title: "Withdraw principal to a wallet",
    body: "There is no such function. Money leaves the contract in three ways: to the staker who earned it, to the fee wallets for fees already charged, and as the capped profit fee. There is no withdraw-a-percentage-of-the-pool function at any size, whatever it might be called.",
  },
  {
    title: "Spend the fee balance as if it were pool capital",
    body: "Collected fees are counted separately and subtracted inside totalAssets(). Fee income never gets counted as pool capital, and withdrawing a fee cannot reach a staker's principal.",
  },
  {
    title: "Raise the deposit fee after you deposit",
    body: "Both rates were fixed when the contract was deployed, under a hard 20% ceiling checked at that moment. Whatever rate you were shown is the rate the contract will always charge.",
  },
  {
    title: "Bill principal as profit",
    body: "The performance fee applies only to what comes back above the principal that went out, and that principal counter is reduced by whatever is actually recovered. Splitting a redemption across several calls cannot invent profit that was not made.",
  },
  {
    title: "Sweep funds without partners and a delay",
    body: "A fund rescue needs three of five votes and then a 48-hour wait enforced on-chain. While any vote is outstanding, the destination address cannot be changed.",
  },
  {
    title: "Override a partner vote",
    body: "The owner has one vote out of five. They cannot unpause their way out of emergency mode, and they cannot add or remove partners while a vote is running.",
  },
];

const limitations = [
  {
    title: "The owner is a single key, not a multisig",
    body: "A Gnosis Safe or a timelock would work as owner without changing a line of code, and either would be safer. For now the partner vote is what stands in for it.",
  },
  {
    title: "Order-book arbitrage is not autonomous",
    body: "Polymarket's order book only accepts orders from approved operators, so the contract can split, merge, and redeem after a market resolves, and nothing more. Continuous buying and selling would need an off-chain component, and we have not built one.",
  },
  {
    title: "Staking economics are not a guarantee",
    body: "The daily rates are settings in the contract, not a return the project has shown it can sustain. Yield is simple rather than compounded, and paying it depends on how the strategy performs and on money coming in.",
  },
  {
    title: "Blacklisting can cost you accrued yield",
    body: "You can always get your principal back, but a blocked address cannot claim yield it has already earned.",
  },
];

const bounty = [
  {
    tier: "Critical",
    reward: "$500",
    body: "Any route that moves staked principal to an address other than the staker who owns it. A drain, a theft, an unauthorised sweep.",
  },
  {
    tier: "High",
    reward: "$150",
    body: "Freezing user funds, getting around a security control such as the partner quorum, the emergency-withdrawal delay or the blacklist limits, or breaking an accounting rule.",
  },
  {
    tier: "Medium",
    reward: "$50",
    body: "Accounting or logic errors that do not move funds by themselves but could add up to something that does.",
  },
  {
    tier: "Low / info",
    reward: "Credit",
    body: "Gas inefficiencies, style issues, or anything already listed above as a known limitation.",
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
            Most staking sites answer this with a promise. Here the answer is in the contract, and
            you can check every line below against the verified source.
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
          If the voting body ever moves to sweep the pool, you get a 36-hour head start. Both clocks
          run on-chain and both start from the same vote.
        </p>
        <div className="glass mt-7 p-6 sm:p-8">
          <ol className="space-y-6">
            {[
              {
                day: "Hour 0",
                title: "Quorum reached",
                body: "Three of five have voted. The protocol pauses straight away and no new capital goes into the strategy.",
              },
              {
                day: "Hour 12",
                title: "Your withdrawal opens",
                body: "Emergency withdrawal opens for everyone. Full principal, no penalty, no permission needed.",
              },
              {
                day: "Hour 48",
                title: "Earliest possible sweep",
                body: "Only now can a rescue go through, and only to the recovery wallet that was locked in when the vote started.",
              },
            ].map((step, i) => (
              <li key={step.day} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
                      i === 1
                        ? "bg-gold-sheen text-onGold shadow-gold"
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
            A page that only lists strengths is an advert. These are the parts we would want to know
            about before depositing.
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
          If you find a real vulnerability, tell us privately before you do anything else and we
          will pay for it. The contract has already been through Slither and a unit, fork and
          invariant test suite, so anything a person finds on top of that is worth paying for.
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
              href={`mailto:${SECURITY_EMAIL}`}
            >
              {SECURITY_EMAIL}
            </a>{" "}
            with a description and, if you can, a proof of concept against a fork rather than
            mainnet. Tell us privately first. Posting it publicly or exploiting it on-chain before a
            fix is out means no reward. If two people find the same issue, the first valid report
            wins. The scope is the deployed contract at{" "}
            <span className="break-all font-mono text-xs text-graphite-200">{CONTRACT}</span> and
            this frontend; known limitations listed above are out of scope.
          </p>
        </div>
      </section>
    </div>
  );
}

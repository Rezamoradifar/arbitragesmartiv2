import Link from "next/link";
import { LiveStats } from "@/components/LiveStats";
import { PolymarketMarkets } from "@/components/PolymarketMarkets";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import {
  SecurityVisual,
  StrategyVisual,
  GlobalVisual,
  AnalyticsVisual,
  EcosystemVisual,
  VerificationVisual,
} from "@/components/visuals/FeatureVisuals";
import { VisualFrame } from "@/components/visuals/primitives";
import { Reveal } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { FaqList } from "@/components/FaqList";
import {
  PLANS,
  PENALTY_SCHEDULE,
  REFERRAL_LEVELS,
  DEPOSIT_FEE_BANDS,
  formatBps,
  grossForNet,
} from "@/lib/contract";

/* ------------------------------------------------------------------
   Section shell — one wrapper so vertical rhythm is identical
   everywhere and never re-typed per section.
------------------------------------------------------------------ */
function SectionHead({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="eyebrow">
        <span className="h-1 w-1 rounded-full bg-gold-400" />
        {eyebrow}
      </span>
      <h2 className="h-section mt-5">{title}</h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-graphite-300">{body}</p>}
    </div>
  );
}

const steps: Array<{ n: string; title: string; body: string; icon: IconName }> = [
  {
    n: "01",
    title: "Connect a wallet",
    body: "Works with MetaMask, Trust, Rainbow, or anything that speaks WalletConnect. There is no signup and no email. The contract only ever sees your address.",
    icon: "wallet",
  },
  {
    n: "02",
    title: "Check the numbers, then deposit",
    body: "Before you sign, the deposit screen shows what leaves your wallet, what the fee is, and what gets recorded as your stake.",
    icon: "layers",
  },
  {
    n: "03",
    title: "Yield builds every second",
    body: "Rewards build against the stake the contract recorded and stop when the term ends. You do not have to claim anything to keep earning.",
    icon: "zap",
  },
  {
    n: "04",
    title: "Claim or leave when you want",
    body: "Claim your yield any time. Leaving early costs a penalty that drops each week and stops at 10%. Neither one needs our approval.",
    icon: "check",
  },
];

const features: Array<{
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  Visual: () => JSX.Element;
  flip?: boolean;
}> = [
  {
    eyebrow: "Smart contract security",
    title: "The owner cannot touch your principal",
    body: "The code running on Polygon has no function that sends staked principal to a wallet. It is not a rule we promise to follow. The option is simply not there.",
    points: [
      "No withdrawal path to an owner wallet",
      "Fee rates were fixed at deployment and cannot be raised",
      "A blocked address can still withdraw",
    ],
    Visual: SecurityVisual,
  },
  {
    eyebrow: "Automated strategies",
    title: "Capital deployment with a hard ceiling",
    body: "No more than 20% of assets can sit in a market position. The cap counts everything already deployed, so splitting one deployment into several does not get around it. The rest stays liquid for withdrawals.",
    points: [
      "20% ceiling, checked on every deployment",
      "Every swap has a slippage limit in the contract",
      "Profit counts only once it settles back in USDT",
    ],
    Visual: StrategyVisual,
    flip: true,
  },
  {
    eyebrow: "Global infrastructure",
    title: "Open to anyone, anywhere",
    body: "It runs on Polygon and works from any wallet. No countries are blocked, there are no opening hours, and nobody stands between you and your position.",
    points: [
      "Polygon mainnet, with low fees and fast confirmation",
      "Any wallet that supports WalletConnect",
      "Every action is a public transaction",
    ],
    Visual: GlobalVisual,
  },
  {
    eyebrow: "Analytics",
    title: "The numbers come from the chain",
    body: "Every figure on this site is read from the contract as the page loads. There is no database behind it, so there is nothing that can quietly go stale or be edited.",
    points: [
      "Read live at the current block",
      "History rebuilt from on-chain events",
      "Your returns calculated from your own claims",
    ],
    Visual: AnalyticsVisual,
    flip: true,
  },
  {
    eyebrow: "Web3 ecosystem",
    title: "Built on standards",
    body: "Ordinary ERC-20 collateral, ordinary wallet connections, and a published interface. Any tool that can read Polygon can read this.",
    points: [
      "USDT on Polygon",
      "Public ABI and verified source",
      "Uses Polymarket's Conditional Tokens directly",
    ],
    Visual: EcosystemVisual,
  },
  {
    eyebrow: "Security center",
    title: "The source is published and verified",
    body: "The code running on Polygon matches the published source exactly. Sourcify checked that, not us. You can read the whole thing before you deposit anything.",
    points: [
      "Exact bytecode match on both creation and runtime code",
      "Partners can freeze the protocol without the owner",
      "Bug bounty with published payouts",
    ],
    Visual: VerificationVisual,
    flip: true,
  },
];

const faqs = [
  {
    q: "What does the fee cost me?",
    a: "It depends on size, and it falls as the deposit grows: 12% under 500 USDT, 10% from 500, 7% from 2,500, and 5% from 10,000. It comes off before your stake is recorded, so 1,000 USDT in means 900 USDT staked. That also moves the floor — the smallest stake the contract accepts is 10 USDT, so the smallest deposit is 11.37. The deposit screen shows the exact split before you sign, and the schedule is fixed in the contract with no function to change it.",
  },
  {
    q: "Can the owner take my deposit?",
    a: "No. Nothing in the contract sends staked principal to an owner address — and the owner address itself receives nothing at all. Fees go to four named wallets: the deposit fee, a claim fee of 10% (5% on the two upper plans), and a capped share of strategy profit. That is the whole list. The one path that can move pooled funds needs 3 of 5 partner votes and then a 48-hour wait, and your own penalty-free withdrawal opens 36 hours before that wait is over.",
  },
  {
    q: "What if I want to leave early?",
    a: "You can leave whenever you want and nobody has to approve it. The penalty is 50% in the first week and falls each week until it settles at 10% from week five. It only applies to your principal. Anything you have not claimed is lost when you exit, so claim first.",
  },
  {
    q: "Are the rates guaranteed?",
    a: "No. They are settings in the contract, not a promise. Yield is paid out of the pool, and over time it has to be covered by money the strategy actually makes. No smart contract can create a return that was not earned somewhere. Treat the rates as today's terms rather than a forecast, and decide how much to deposit on that basis.",
  },
  {
    q: "How do referrals pay?",
    a: "Each time someone you referred claims their yield, a share of that claim goes up the chain: 8% to 20% to you depending on your tier, 4% to 10% to whoever referred you, and 2% to 5% one level above that. It is taken out of the claim rather than added on top, so the pool never pays out more than the yield that was actually earned. Your link only counts if you already have an active stake when they stake, and you keep earning only while that stake stays open."
  },
  {
    q: "How do I check any of this myself?",
    a: "The full source is published and verified against the deployed bytecode on Sourcify, and you can read it on PolygonScan or Blockscout. Every number on this site comes from that contract. The security page also lists what is weak about it, not just what is strong.",
  },
];

export default function Home() {
  return (
    <>
      {/* ============ 2. CINEMATIC HERO ============ */}
      <section className="relative isolate overflow-hidden">
        {/* The visual is absolutely positioned and masked so the headline sits
            over its darkest region — text legibility first, art second. */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-[.85]">
            <HeroVisual />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-graphite-950 via-graphite-950/85 to-graphite-950/40" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-graphite-950 to-transparent" />
        </div>

        <div className="container-page relative flex min-h-[86vh] flex-col justify-center py-20 lg:min-h-[88vh]">
          <div className="max-w-2xl">
            <span className="eyebrow animate-fade-up">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
              </span>
              Live on Polygon mainnet
            </span>

            <h1 className="h-display mt-7 animate-fade-up animate-delay-100">
              ARBI<span className="text-gold-gradient">SMART</span>
            </h1>

            <p className="mt-5 animate-fade-up animate-delay-200 font-display text-xl font-medium tracking-tight text-graphite-100 sm:text-2xl">
              Advanced Digital Asset Infrastructure
            </p>

            <p className="mt-5 max-w-xl animate-fade-up animate-delay-300 text-[15px] leading-relaxed text-graphite-300 sm:text-base">
              Fixed-rate staking on Polygon. The contract is published and verified, the amount that
              can go into the strategy is capped, and you can withdraw without asking us.
            </p>

            <div className="mt-9 flex animate-fade-up animate-delay-500 flex-wrap items-center gap-3">
              <Link href="/dashboard" className="btn-primary">
                Launch Platform
                <Icon name="arrowUp" className="h-4 w-4 rotate-45" />
              </Link>
              <Link href="/security" className="btn-secondary">
                Explore Platform
              </Link>
            </div>

            <div className="mt-10 flex animate-fade-in animate-delay-700 flex-wrap items-center gap-x-6 gap-y-3 text-xs text-graphite-400">
              {["Verified on Sourcify", "Non-custodial", "Exit always open"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Icon name="check" className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.4} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 3. PLATFORM STATISTICS ============ */}
      <section className="container-page -mt-6 pb-24">
        <LiveStats />
      </section>

      {/* ============ 4. HOW ARBISMART WORKS ============ */}
      <section className="container-page py-20">
        <Reveal>
          <SectionHead
            eyebrow="How it works"
            title="Four steps, nobody in between"
            body="Going from a cold wallet to an open position takes a few minutes. Getting back out works the same way."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="glass glass-hover h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-graphite-700">{s.n}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/20 bg-gold-500/10 text-gold-400">
                    <Icon name={s.icon} className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <h3 className="mt-5 font-display text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-graphite-400">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 5-9. CORE TECHNOLOGY / STRATEGIES / SECURITY / ANALYTICS / ECOSYSTEM ============ */}
      <section className="container-page space-y-24 py-10 lg:space-y-32">
        {features.map((f, i) => (
          <Reveal key={f.title}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={`min-w-0 ${f.flip ? "lg:order-2" : ""}`}>
                <SectionHead eyebrow={f.eyebrow} title={f.title} body={f.body} />
                <ul className="mt-7 space-y-3">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-400/25 bg-gold-500/10">
                        <Icon name="check" className="h-3 w-3 text-gold-400" strokeWidth={2.6} />
                      </span>
                      <span className="text-sm leading-relaxed text-graphite-300">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`min-w-0 ${f.flip ? "lg:order-1" : ""}`}>
                <VisualFrame className="shadow-glass-lg">
                  <f.Visual />
                </VisualFrame>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ============ LIVE MARKET DATA ============ */}
      <section className="container-page py-20">
        <PolymarketMarkets />
      </section>

      {/* ============ PLANS ============ */}
      <section className="container-page py-24">
        <Reveal>
          <SectionHead
            eyebrow="Staking plans"
            title="Four tiers, one set of rules"
            body="Bigger deposits earn a higher daily rate over a shorter term. Your tier comes from the stake the contract records, which is your deposit minus the fee, so the amount you need to send is a little above the tier minimum."
            align="center"
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => {
            const lead = i === PLANS.length - 1;
            return (
              <Reveal key={p.name} delay={i * 80}>
                <div className={`glass glass-hover h-full p-6 ${lead ? "glass-gold" : ""}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-white">{p.name}</h3>
                    {lead && (
                      <span className="rounded-full border border-gold-400/30 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300">
                        Top tier
                      </span>
                    )}
                  </div>
                  <p className="mt-5 font-display text-4xl font-bold tracking-tight">
                    <span className={lead ? "text-gold-gradient" : "text-white"}>
                      {(p.dailyBps / 100).toFixed(2)}
                    </span>
                    <span className="ml-1 text-sm font-medium text-graphite-400">%/day</span>
                  </p>
                  <div className="mt-6 space-y-3 border-t border-white/[.06] pt-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs uppercase tracking-wider text-graphite-500">
                        Stake needed
                      </span>
                      <span className="text-sm font-semibold text-graphite-100">
                        {p.minStake.toLocaleString("en-US")} USDT
                      </span>
                    </div>
                    {/* The tier is decided by the recorded stake, so quoting only
                        the minimum would send anyone who deposits exactly that
                        into the tier below. Show what to actually send. */}
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs uppercase tracking-wider text-graphite-500">
                        Deposit to reach it
                      </span>
                      <span className="text-sm font-semibold text-gold-300">
                        {grossForNet(p.minStake).toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        USDT
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs uppercase tracking-wider text-graphite-500">Term</span>
                      <span className="text-sm font-semibold text-graphite-100">{p.durationDays} days</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={150}>
          <div className="glass mt-8 p-6">
            <h3 className="font-display text-base font-semibold text-white">Deposit fee</h3>
            <p className="mt-2 text-sm leading-relaxed text-graphite-400">
              Charged once, before the stake is recorded. It falls as the deposit grows, so the
              figures below are what reaches your position.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {DEPOSIT_FEE_BANDS.slice().reverse().map((b, i, arr) => {
                const next = arr[i + 1];
                return (
                  <div key={b.bps} className="rounded-lg border border-white/[.06] bg-white/[.02] px-3.5 py-3">
                    <p className="text-xs text-graphite-500">
                      {next ? `${b.from.toLocaleString("en-US")}–${(next.from - 1).toLocaleString("en-US")}` : `${b.from.toLocaleString("en-US")}+`}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-gold-300">
                      {formatBps(b.bps)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-graphite-500">
              Claiming carries a separate fee of 10%, halved to 5% on Advanced and Elite.
            </p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="glass-panel">
              <h3 className="font-display text-base font-semibold text-white">Referral tiers</h3>
              <p className="mt-2 text-sm text-graphite-400">
                Paid from the pool each time the person you referred claims, down three levels.
                Their own payout is not reduced.
              </p>
              <div className="mt-5 space-y-2.5">
                {REFERRAL_LEVELS.map((l) => (
                  <div key={l.name} className="flex items-center justify-between gap-4 rounded-lg bg-white/[.02] px-3.5 py-2.5">
                    <span className="text-sm font-medium text-graphite-100">{l.name}</span>
                    <span className="text-xs tabular-nums text-graphite-400">
                      <span className="text-gold-300">{formatBps(l.f1Bps)}</span> direct ·{" "}
                      <span className="text-volt-300">{formatBps(l.f2Bps)}</span> second level
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="font-display text-base font-semibold text-white">Exit penalty schedule</h3>
              <p className="mt-2 text-sm text-graphite-400">
                Applies to your principal only, and drops every week until it settles at 10%. You can
                exit at any point on this curve.
              </p>
              <div className="mt-6 flex items-end gap-2.5">
                {PENALTY_SCHEDULE.map((w, i) => {
                  const pct = w.bps / 100;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums text-graphite-200">{pct}%</span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-volt-700/70 to-gold-400/80"
                        style={{ height: `${Math.max(10, pct * 2.1)}px` }}
                      />
                      <span className="text-[10px] text-graphite-500">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ 10. FAQ ============ */}
      <section className="container-page py-20">
        <Reveal>
          <SectionHead
            eyebrow="FAQ"
            title="Common questions"
            body="Including the ones where the answer is not what you were hoping for."
            align="center"
          />
        </Reveal>
        <Reveal delay={120}>
          <div className="mx-auto mt-12 max-w-3xl">
            <FaqList items={faqs} />
          </div>
        </Reveal>
      </section>

      {/* ============ 11. FINAL CTA ============ */}
      <section className="container-page py-20">
        <Reveal>
          <div className="glass glass-gold relative overflow-hidden px-6 py-16 text-center sm:px-14">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
              <HeroVisual />
            </div>
            <div className="pointer-events-none absolute inset-0 -z-10 bg-graphite-950/70" />

            <h2 className="h-section mx-auto max-w-2xl">
              Check it yourself <span className="text-gold-gradient">before you decide.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-graphite-300">
              Everything on this page can be checked against the code running on Polygon. Read the
              source, read the known limitations, then decide how much to put in.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="btn-primary">
                Launch Platform
              </Link>
              <Link href="/security" className="btn-secondary">
                Read the security model
              </Link>
              <a
                href="https://t.me/arbhub_site"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Join on Telegram
              </a>
            </div>
            {/* Named here rather than left as a bare icon in the header: the
                impersonation risk is real, and the defence is that people know
                which handle is the right one before they go looking. */}
            <p className="mt-5 text-xs text-graphite-500">
              Weekly numbers with an explorer link under each one. The only official channel is{" "}
              <span className="text-graphite-300">@arbhub_site</span>.
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}

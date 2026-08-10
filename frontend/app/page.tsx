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
import { PLANS, PENALTY_SCHEDULE, REFERRAL_LEVELS, formatBps, grossForNet } from "@/lib/contract";

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
    body: "MetaMask, Trust, Rainbow or any WalletConnect wallet. No account, no email, no custody transfer — the contract only ever sees an address.",
    icon: "wallet",
  },
  {
    n: "02",
    title: "Review the split, then deposit",
    body: "The deposit screen shows exactly what a given amount buys — the platform fee and the stake that gets recorded — before you sign anything.",
    icon: "layers",
  },
  {
    n: "03",
    title: "Yield accrues per second",
    body: "Rewards accumulate continuously against your recorded stake and stop at the end of the term. Nothing needs claiming to keep accruing.",
    icon: "zap",
  },
  {
    n: "04",
    title: "Claim or exit, on your terms",
    body: "Claim yield whenever you like. Exit whenever you like, at a penalty that declines weekly to a 10% floor. Neither needs anyone's approval.",
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
    title: "The owner cannot reach your principal",
    body: "Not as a policy — as an absence. There is no function in the deployed bytecode that moves staked principal to a wallet, so there is nothing to trust and nothing to revoke.",
    points: [
      "No withdrawal path to any owner-controlled address",
      "Fee rates are compile-time constants, not settings",
      "Blacklisting can never block an exit",
    ],
    Visual: SecurityVisual,
  },
  {
    eyebrow: "Automated strategies",
    title: "Capital deployment with a hard ceiling",
    body: "At most 20% of assets can ever sit in a market position, and the cap is cumulative — repeated deployments cannot walk past it. The rest stays liquid for withdrawals, always.",
    points: [
      "Cumulative 20% ceiling, enforced on every call",
      "Swaps carry a contract-level slippage floor",
      "Profit is only booked once it settles in the pool's own currency",
    ],
    Visual: StrategyVisual,
    flip: true,
  },
  {
    eyebrow: "Global infrastructure",
    title: "Permissionless, everywhere, always on",
    body: "Deployed on Polygon and reachable from any wallet on earth. No regional gating, no business hours, no intermediary between a holder and their own position.",
    points: [
      "Polygon mainnet — low fees, fast finality",
      "Any WalletConnect-compatible wallet",
      "Every action settles on a public ledger",
    ],
    Visual: GlobalVisual,
  },
  {
    eyebrow: "Analytics",
    title: "Read the protocol, not a dashboard",
    body: "Every figure shown is read live from the contract at the block you are looking at. Nothing is cached, aggregated or reported from a private database.",
    points: [
      "Live reads, straight from chain state",
      "Full event-sourced transaction history",
      "Portfolio performance built from your own claims",
    ],
    Visual: AnalyticsVisual,
    flip: true,
  },
  {
    eyebrow: "Web3 ecosystem",
    title: "Composable by construction",
    body: "Standard ERC-20 collateral, standard wallet connections, and a verified interface any tool can read. Nothing here is a walled garden.",
    points: [
      "USDT collateral on Polygon",
      "Public ABI, verified source",
      "Direct integration with Polymarket's Conditional Tokens",
    ],
    Visual: EcosystemVisual,
  },
  {
    eyebrow: "Security center",
    title: "Verified byte-for-byte, publicly",
    body: "The deployed bytecode matches the published source exactly, confirmed independently on Sourcify. You do not have to take our word for any claim on this page.",
    points: [
      "Exact-match verification on creation and runtime bytecode",
      "Partner governance can freeze the protocol over the owner",
      "Live bug bounty with published reward tiers",
    ],
    Visual: VerificationVisual,
    flip: true,
  },
];

const faqs = [
  {
    q: "What does the platform fee actually cost me?",
    a: "A 10% development fee is charged on each deposit, split across two operations wallets. It is taken before the stake is recorded, so a 1,000 USDT deposit records a 900 USDT stake and the contract holds exactly what it owes from the first block. The deposit screen shows the split before you sign, and the rate is immutable — it cannot be raised after you have read it.",
  },
  {
    q: "Can the owner take my deposit?",
    a: "No. There is no function in the contract that transfers staked principal to an owner-controlled address. The owner receives fees — 10% of yield at claim time and a capped share of realised strategy profit — and nothing else. The emergency rescue path that can move pooled funds needs a 3-of-5 partner vote plus a 48-hour delay, and stakers' own no-penalty withdrawal opens 36 hours before it can fire.",
  },
  {
    q: "What happens if I want to leave early?",
    a: "Early exit is always available and needs no one's approval. The penalty starts at 50% in week one and declines each week to a 10% floor from week five. It applies to principal only. Unclaimed yield is forfeited on exit, so claim first, then exit.",
  },
  {
    q: "Are the advertised rates guaranteed?",
    a: "No. They are contract parameters, not promises. Yield is paid from pooled capital and, over time, must be funded by real returns; nothing in a smart contract can manufacture a return that the underlying strategy has not earned. Treat the rates as the terms currently encoded, not as a forecast, and size your position accordingly.",
  },
  {
    q: "How does the referral programme pay out?",
    a: "Referral rewards are funded from protocol fees, not deducted from the referred user's principal or yield — their position is unaffected by whether they were referred. It pays two levels deep across four tiers. Your link only credits referrals while you hold an active stake, so stake before you share it.",
  },
  {
    q: "Where can I verify all of this myself?",
    a: "The full source is published and verified with an exact bytecode match on Sourcify, and readable on PolygonScan and Blockscout. Every number on this site is read live from that contract. The security page documents the known limitations as plainly as the strengths.",
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
              Fixed-rate staking on an open, verified contract — with a bounded strategy allocation,
              partner-governed emergency controls, and an exit that never requires anyone&apos;s
              permission.
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
            title="Four steps, no intermediaries"
            body="From a cold wallet to an accruing position in a few minutes — and back out again whenever you decide."
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
            body="Higher tiers pay a higher daily rate over a shorter term, in exchange for a larger minimum. The tier is determined by the stake actually recorded after the platform fee."
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

        <Reveal delay={200}>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="glass-panel">
              <h3 className="font-display text-base font-semibold text-white">Referral tiers</h3>
              <p className="mt-2 text-sm text-graphite-400">
                Paid from protocol fees, two levels deep. A referred user&apos;s own position is never
                reduced to fund it.
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
                Applies to principal only, and declines every week to a permanent floor. Exit is
                available at any point on this curve.
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
            title="The questions worth asking first"
            body="Including the ones with uncomfortable answers."
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
              Verify everything. <span className="text-gold-gradient">Then decide.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-graphite-300">
              Every claim on this page is checkable against the deployed bytecode. Read the source,
              read the limitations, and size your position on what you can confirm.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" className="btn-primary">
                Launch Platform
              </Link>
              <Link href="/security" className="btn-secondary">
                Read the security model
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

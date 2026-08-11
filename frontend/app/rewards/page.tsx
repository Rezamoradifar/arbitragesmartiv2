import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { EcosystemVisual } from "@/components/visuals/FeatureVisuals";
import { VisualFrame } from "@/components/visuals/primitives";

export const metadata: Metadata = {
  title: "Gold rewards",
  description:
    "Physical gold for the builders who bring real volume. Every threshold is an on-chain number anyone can check.",
};

/**
 * Every threshold here is a value the contract already tracks and anyone can
 * read. That is deliberate: a prize judged on a number only we can see is a
 * prize nobody can hold us to, and the arguments start the day someone misses
 * by a little.
 */
const TIERS = [
  {
    weight: "1 g",
    label: "One gram",
    volume: 5_000,
    note: "Roughly six referrals at 1,000 USDT each.",
  },
  {
    weight: "5 g",
    label: "Five grams",
    volume: 25_000,
    note: "Roughly 28 referrals at 1,000 USDT each.",
  },
  {
    weight: "10 g",
    label: "Ten grams",
    volume: 50_000,
    note: "Roughly 56 referrals at 1,000 USDT each.",
  },
  {
    weight: "1 oz",
    label: "One troy ounce",
    volume: 150_000,
    lead: true,
    note: "31.1 g. Roughly 167 referrals at 1,000 USDT each.",
  },
];

const CONDITIONS = [
  {
    n: "01",
    title: "The number that counts is direct volume",
    body: "Your direct volume is the total recorded stake of the people you referred yourself — the same figure the contract exposes through getTeamVolume, and the same one your tier is calculated from. Second and third level volume does not count toward a gold tier.",
  },
  {
    n: "02",
    title: "Recorded stake, not deposits",
    body: "A 1,000 USDT deposit records roughly 900 USDT of stake after the entry fee, and it is the 900 that counts. This is the same number shown on your dashboard, so there is nothing to reconcile.",
  },
  {
    n: "03",
    title: "It is measured at one moment, announced in advance",
    body: "We publish a block number before each round closes and read every balance at that block. Not the peak you reached, not an average — the value at that block. A snapshot is the only rule that cannot be argued with afterwards, because anyone can replay it.",
  },
  {
    n: "04",
    title: "Volume that left does not count",
    body: "When someone you referred exits, their stake stops counting toward your volume, exactly as it stops counting toward your referral tier. Building volume that stays is the point.",
  },
  {
    n: "05",
    title: "You need an active position of your own",
    body: "At the snapshot block your own stake must be active and at least 500 USDT. The programme rewards people building alongside the protocol, not routing around it.",
  },
  {
    n: "06",
    title: "One bar per address per round",
    body: "You receive the highest tier you qualify for, once. Tiers do not stack and are not cumulative across rounds. Splitting one downline across several wallets does not multiply the prize — it divides the volume and usually costs you a tier.",
  },
];

const FINE_PRINT = [
  {
    q: "Do I have to identify myself?",
    a: "To receive physical metal, yes. We need a name and a delivery address, and depending on the destination a photo ID for customs. Nothing else about the protocol asks for this, and we are not comfortable pretending otherwise: claiming a gold bar is the one part of ArbiSmart that is not anonymous. If that is a problem, take the cash alternative.",
  },
  {
    q: "Is there a cash alternative?",
    a: "Yes. You can take the spot value of the bar in USDT instead, priced at the LBMA afternoon fix on the day the round closes. No identity documents are needed for that route, only the wallet that qualified.",
  },
  {
    q: "Who pays shipping and customs?",
    a: "We pay insured shipping. Import duty and any tax in your own country are yours — rules differ too much between countries for us to promise otherwise, and in several of them precious metal is treated quite differently from a normal parcel. Check your local rules before choosing metal over cash.",
  },
  {
    q: "How long does delivery take?",
    a: "We order after the round closes and the winners are confirmed on-chain. Expect two to six weeks depending on destination. The cash alternative is paid within 72 hours.",
  },
  {
    q: "What if two people are level at the deadline?",
    a: "Both receive the tier. There is no single winner to tie over — every address that clears a threshold at the snapshot block gets that tier.",
  },
  {
    q: "Can the programme be cancelled?",
    a: "A round already announced runs to its published block. We can decide not to open a further round, and will say so rather than letting one quietly lapse.",
  },
];

export default function RewardsPage() {
  return (
    <div className="container-page space-y-16 py-10 sm:space-y-20 sm:py-14">
      {/* ---------------------------------------------------------- hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0">
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 shadow-[0_0_10px_2px_rgba(224,173,60,.6)]" />
            Rewards programme
          </p>
          <h1 className="h-display mt-5">
            Real <span className="text-gold-gradient">gold</span> for real volume
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-graphite-300">
            Bring people who stake and stay, and we send you metal. Every threshold below is a
            number the contract already publishes, so you can check where you stand at any moment
            without asking us.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">
              See your volume
              <Icon name="arrowUp" className="h-4 w-4 rotate-45" />
            </Link>
            <a href="#conditions" className="btn-secondary">
              Read the conditions
            </a>
          </div>
        </div>
        <VisualFrame className="hidden lg:block">
          <EcosystemVisual />
        </VisualFrame>
      </section>

      {/* --------------------------------------------------------- tiers */}
      <section>
        <h2 className="h-section">The tiers</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Measured on direct volume — the recorded stake of people you referred yourself.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => (
            <div key={t.weight} className={`glass glass-hover p-6 ${t.lead ? "glass-gold" : ""}`}>
              <GoldBar lead={t.lead} />
              <p className="mt-5 font-display text-3xl font-bold tracking-tight">
                <span className={t.lead ? "text-gold-gradient" : "text-white"}>{t.weight}</span>
              </p>
              <p className="mt-1 text-sm text-graphite-300">{t.label}</p>
              <div className="mt-5 border-t border-white/[.06] pt-4">
                <p className="text-xs uppercase tracking-wider text-graphite-500">Direct volume</p>
                <p className="mt-1 font-display text-lg font-semibold text-white">
                  {t.volume.toLocaleString("en-US")}
                  <span className="ml-1.5 text-xs font-medium text-graphite-400">USDT</span>
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-graphite-500">{t.note}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-graphite-500">
          Bars are 999.9 fine, supplied with the refiner&apos;s assay certificate. The
          referral-count figures are indicative only — the threshold is the volume, not the number
          of people.
        </p>
      </section>

      {/* ---------------------------------------------------- conditions */}
      <section id="conditions" className="scroll-mt-24">
        <h2 className="h-section">Conditions</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Six rules, all of them checkable against the chain. Nothing here is at our discretion.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {CONDITIONS.map((c) => (
            <div key={c.n} className="glass p-6">
              <div className="flex items-start gap-4">
                <span className="font-display text-2xl font-bold text-graphite-700">{c.n}</span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-300">{c.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- measure */}
      <section className="glass p-7 sm:p-9">
        <h2 className="font-display text-xl font-semibold text-white">
          How to check where you stand
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Your direct volume is on your dashboard, and it is the same number the contract returns to
          anyone who asks it. You do not have to take our figure for it:
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[.06] bg-graphite-950/70 p-4 font-mono text-xs leading-relaxed text-graphite-300">
{`cast call ${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS} \\
  "getTeamVolume(address)(uint256,uint256,uint256)" <YOUR_ADDRESS> \\
  --rpc-url https://polygon-rpc.com

# first value = direct volume, in USDT with 6 decimals`}
        </pre>
        <p className="mt-4 text-xs leading-relaxed text-graphite-500">
          The first number returned is the one the tiers are measured on. The second and third are
          your deeper levels, which earn referral rewards but do not count toward a gold tier.
        </p>
      </section>

      {/* ----------------------------------------------------- fine print */}
      <section>
        <h2 className="h-section">The parts people ask about later</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Better to read them now than to discover them holding a customs form.
        </p>
        <div className="mt-8 space-y-4">
          {FINE_PRINT.map((f) => (
            <div key={f.q} className="glass p-6">
              <h3 className="font-display font-semibold text-white">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite-300">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- closing */}
      <section className="glass glass-gold p-7 text-center sm:p-10">
        <h2 className="h-section mx-auto max-w-2xl">Round dates are announced before they open</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-graphite-300">
          Each round is published with its closing block before it starts, so the finish line is
          fixed in advance and visible to everyone. Announcements go out on Telegram and by email.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="https://t.me/arbhub_site" target="_blank" rel="noreferrer" className="btn-primary">
            Get round announcements
          </a>
          <a href="mailto:support@arbhub.site" className="btn-secondary">
            Ask a question
          </a>
        </div>
      </section>
    </div>
  );
}

/**
 * A gold bar, drawn rather than photographed.
 *
 * Stock imagery of bullion is both a cliché and a small lie — it shows metal
 * nobody in this programme has been sent yet. A simple isometric solid reads
 * as "a bar" without pretending to be a photograph of one.
 */
function GoldBar({ lead = false }: { lead?: boolean }) {
  const id = lead ? "bar-lead" : "bar";
  return (
    <svg viewBox="0 0 88 56" className="h-14 w-auto" aria-hidden>
      <defs>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4df9c" />
          <stop offset="60%" stopColor="#e0ad3c" />
          <stop offset="100%" stopColor="#d0932a" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d0932a" />
          <stop offset="100%" stopColor="#8d551c" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b3741f" />
          <stop offset="100%" stopColor="#74441e" />
        </linearGradient>
      </defs>
      {/* Top face, trapezoid so the bar reads as tapered like a real ingot. */}
      <path d="M20 16 L64 16 L74 26 L10 26 Z" fill={`url(#${id}-top)`} />
      {/* Front and side. */}
      <path d="M10 26 L58 26 L58 44 L10 40 Z" fill={`url(#${id}-front)`} />
      <path d="M58 26 L74 26 L74 40 L58 44 Z" fill={`url(#${id}-side)`} />
      {/* Stamp lines, suggested rather than legible. */}
      <g opacity=".35" stroke="#3a2408" strokeWidth="1.4" strokeLinecap="round">
        <path d="M18 32 h20" />
        <path d="M18 36 h12" />
      </g>
    </svg>
  );
}

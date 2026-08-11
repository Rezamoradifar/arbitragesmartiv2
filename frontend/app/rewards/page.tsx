import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RoundCountdown } from "@/components/RoundCountdown";
import { EcosystemVisual } from "@/components/visuals/FeatureVisuals";
import { VisualFrame } from "@/components/visuals/primitives";
import { REFERRAL_LEVELS } from "@/lib/contract";

export const metadata: Metadata = {
  title: "Gold rewards",
  description:
    "Physical gold for the builders who bring real volume. Every threshold is an on-chain number anyone can check.",
};

/**
 * Round 1. Both dates are constants so a new round is a two-line change, and
 * the closing block is what actually decides the winners — the date is the
 * human-readable form of it.
 */
const ROUND = {
  name: "Round 1",
  opensAt: "2026-08-11T00:00:00Z",
  endsAt: "2026-11-09T00:00:00Z",
  /** Published before the round closes; until then this stays null. */
  snapshotBlock: null as number | null,
};

/**
 * One gram per 5,000 USDT of direct volume, all the way up.
 *
 * A single ratio rather than a hand-tuned ladder: every tier costs the same
 * percentage of the volume it rewards, so the programme's budget scales with
 * what it brings in instead of getting more expensive at the top. It is also
 * the only version anyone can check in their head.
 */
const GRAMS_PER_VOLUME = 5_000;

const TIERS = [1, 5, 10, 25, 50, 100, 250, 500, 1000].map((grams) => ({
  grams,
  volume: grams * GRAMS_PER_VOLUME,
  label: grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`,
}));

/** The four shown as cards; the whole ladder is in the table below them. */
const HIGHLIGHT = [1, 50, 250, 1000];

/** Fixed to UTC so the server and the browser print the same string. */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
    body: "Each round has a closing date fixed before it opens, and a block number published shortly before it. Every balance is read at that block. Not the peak you reached, not an average — the value at that block. A snapshot is the only rule that cannot be argued with afterwards, because anyone can replay it.",
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

      {/* --------------------------------------------------------- round */}
      <section className="glass glass-gold p-7 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="eyebrow">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {ROUND.name} · closes {fmtDate(ROUND.endsAt)}
            </p>
            <h2 className="h-section mt-4">This round is on a clock</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-graphite-300">
              The programme runs in rounds, not forever. {ROUND.name} opened on{" "}
              {fmtDate(ROUND.opensAt)} and closes on {fmtDate(ROUND.endsAt)}. Volume built after that
              moment belongs to the next round.
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-xs uppercase tracking-[.14em] text-graphite-500">
              Time left in {ROUND.name}
            </p>
            <RoundCountdown endsAt={ROUND.endsAt} />
          </div>
        </div>
        <p className="mt-6 border-t border-white/[.06] pt-5 text-xs leading-relaxed text-graphite-500">
          Snapshot block:{" "}
          {ROUND.snapshotBlock === null ? (
            <span className="text-graphite-300">
              published here at least seven days before the closing date
            </span>
          ) : (
            <span className="font-mono text-graphite-200">{ROUND.snapshotBlock}</span>
          )}
          . Balances are read at that block and nowhere else.
        </p>
      </section>

      {/* --------------------------------------------------------- tiers */}
      <section>
        <h2 className="h-section">The tiers</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          One gram for every {GRAMS_PER_VOLUME.toLocaleString("en-US")} USDT of direct volume — the
          recorded stake of people you referred yourself. The same ratio from the first gram to the
          last, so there is no ladder to memorise.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.filter((t) => HIGHLIGHT.includes(t.grams)).map((t) => {
            const lead = t.grams === 1000;
            return (
              <div key={t.grams} className={`glass glass-hover p-6 ${lead ? "glass-gold" : ""}`}>
                <GoldBar grams={t.grams} lead={lead} />
                <p className="mt-5 font-display text-3xl font-bold tracking-tight">
                  <span className={lead ? "text-gold-gradient" : "text-white"}>{t.label}</span>
                </p>
                <p className="mt-1 text-sm text-graphite-300">
                  {lead ? "The top of the ladder" : "999.9 fine, assay included"}
                </p>
                <div className="mt-5 border-t border-white/[.06] pt-4">
                  <p className="text-xs uppercase tracking-wider text-graphite-500">Direct volume</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white">
                    {t.volume.toLocaleString("en-US")}
                    <span className="ml-1.5 text-xs font-medium text-graphite-400">USDT</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[.07]">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-white/[.07] bg-white/[.02] text-left">
                <th className="px-5 py-3 font-medium text-graphite-400">Reward</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">
                  Direct volume required
                </th>
                <th className="hidden px-5 py-3 text-right font-medium text-graphite-400 sm:table-cell">
                  Equivalent at 10,000 USDT each
                </th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr
                  key={t.grams}
                  className={`border-b border-white/[.04] last:border-0 ${
                    t.grams === 1000 ? "bg-gold-400/[.05]" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-display font-semibold text-white">
                    <span className={t.grams === 1000 ? "text-gold-gradient" : undefined}>
                      {t.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-200">
                    {t.volume.toLocaleString("en-US")}
                  </td>
                  <td className="hidden px-5 py-3 text-right text-graphite-400 sm:table-cell">
                    {Math.round(t.volume / 10_000).toLocaleString("en-US")} stakers
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-graphite-500">
          Bars are 999.9 fine, supplied with the refiner&apos;s assay certificate. The last column is
          only an illustration of what the volume might look like — the threshold is the volume
          itself, never the number of people.
        </p>
      </section>

      {/* ------------------------------------------------------ referral */}
      <section id="referral" className="scroll-mt-24">
        <h2 className="h-section">The referral plan behind the volume</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Gold is the bonus on top. The everyday reward is the referral programme, which pays you a
          share of what your team claims — taken out of that claim, three levels deep, in USDT, the
          moment they claim it. Your tier is set by your own stake and by the volume underneath you.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/[.07]">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-white/[.07] bg-white/[.02] text-left">
                <th className="px-5 py-3 font-medium text-graphite-400">Tier</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">Level 1</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">Level 2</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">Level 3</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">Your stake</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">Direct volume</th>
                <th className="px-5 py-3 text-right font-medium text-graphite-400">Directs</th>
              </tr>
            </thead>
            <tbody>
              {REFERRAL_LEVELS.map((l) => (
                <tr
                  key={l.level}
                  className={`border-b border-white/[.04] last:border-0 ${
                    l.level === 3 ? "bg-gold-400/[.05]" : ""
                  }`}
                >
                  <td className="px-5 py-3 font-display font-semibold text-white">
                    <span className={l.level === 3 ? "text-gold-gradient" : undefined}>{l.name}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-100">
                    {l.f1Bps / 100}%
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-200">
                    {l.f2Bps / 100}%
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-300">
                    {l.f3Bps === 0 ? "—" : `${l.f3Bps / 100}%`}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-400">
                    {l.needStake === 0 ? "—" : l.needStake.toLocaleString("en-US")}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-400">
                    {l.needVolume === 0 ? "—" : l.needVolume.toLocaleString("en-US")}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-graphite-400">
                    {l.needRefs === 0 ? "—" : l.needRefs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "All three conditions, not one",
              body: "A tier needs your own active stake, the direct volume and the headcount together. Twenty-five wallets holding 10 USDT each will not reach Platinum, and neither will one whale on its own.",
            },
            {
              title: "Paid from the claim",
              body: "When someone in your team claims, their upline share comes out of that claim. Nothing is minted for it and nobody else's principal pays for it.",
            },
            {
              title: "It moves with your team",
              body: "If a referred stake exits, its volume leaves your total the same day. Tiers are a live measurement, not a badge you keep.",
            },
          ].map((c) => (
            <div key={c.title} className="glass p-5">
              <h3 className="font-display font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite-300">{c.body}</p>
            </div>
          ))}
        </div>
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
        <h2 className="h-section mx-auto max-w-2xl">
          {ROUND.name} closes {fmtDate(ROUND.endsAt)}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-graphite-300">
          The snapshot block goes out on Telegram and by email at least a week beforehand, along with
          the dates for whatever round comes next. Nothing is decided after the fact.
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
 * Bullion, drawn rather than photographed.
 *
 * Stock imagery of gold is both a cliché and a small lie — it shows metal
 * nobody in this programme has been sent yet. A drawn ingot reads as "a bar"
 * without pretending to be a photograph of one, and it stays crisp at any
 * size. The stack height tracks the tier, so the cards read at a glance
 * before anyone gets to the numbers.
 */
function GoldBar({ grams, lead = false }: { grams: number; lead?: boolean }) {
  /** One, two or three bars. Enough to signal scale; more just reads as noise. */
  const count = grams >= 250 ? 3 : grams >= 25 ? 2 : 1;

  /**
   * The drawing also grows with the tier. Stack height alone is too coarse a
   * signal — a gram and a kilo should not be the same object twice.
   */
  const scale = grams >= 1000 ? 1 : grams >= 250 ? 0.9 : grams >= 25 ? 0.78 : 0.6;

  /** Gradients are document-scoped, so every instance needs its own ids. */
  const id = `bar-${grams}`;

  /** The top face of the bar; the front face hangs off its long edge. */
  const TOP = "M30 46 L78 46 L94 60 L14 60 Z";
  const FRONT = "M14 60 L94 60 L88 78 L20 78 Z";

  /** Bottom bar first: later paths paint over earlier ones, which is exactly
   *  the occlusion a stack needs. */
  const layers = Array.from({ length: count }, (_, i) => ({
    dy: -18 * i,
    dx: i % 2 === 0 ? 0 : 3,
    top: i === count - 1,
  }));

  return (
    <svg
      viewBox="0 0 108 96"
      className="h-24 w-auto"
      role="img"
      aria-label={`${grams >= 1000 ? grams / 1000 + " kilogram" : grams + " gram"} gold bar`}
    >
      <defs>
        {/* Top face: the lit surface, brightest along the near edge. */}
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2=".8" y2="1">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="40%" stopColor="#f2d47e" />
          <stop offset="100%" stopColor="#d49d31" />
        </linearGradient>
        {/* Front face: falls into shadow toward the base. */}
        <linearGradient id={`${id}-front`} x1=".1" y1="0" x2=".35" y2="1">
          <stop offset="0%" stopColor="#dfab3f" />
          <stop offset="35%" stopColor="#bd8420" />
          <stop offset="80%" stopColor="#8a5417" />
          <stop offset="100%" stopColor="#653c11" />
        </linearGradient>
        {/* One narrow specular sweep. Restrained on purpose: a wide highlight
            reads as plastic rather than metal. */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2=".35">
          <stop offset="30%" stopColor="#fff8e2" stopOpacity="0" />
          <stop offset="46%" stopColor="#fff8e2" stopOpacity=".26" />
          <stop offset="54%" stopColor="#fff8e2" stopOpacity=".26" />
          <stop offset="70%" stopColor="#fff8e2" stopOpacity="0" />
        </linearGradient>
        {/* Contact glow. Radial so it fades rather than ending on a line. */}
        <radialGradient id={`${id}-shadow`} cx=".5" cy=".5" r=".5">
          <stop offset="0%" stopColor="#e0ad3c" stopOpacity=".34" />
          <stop offset="100%" stopColor="#e0ad3c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="54" cy="82" rx={46 * scale} ry={8 * scale} fill={`url(#${id}-shadow)`} />

      <g transform={`translate(54 80) scale(${scale}) translate(-54 -80)`}>
        {layers.map(({ dy, dx, top }) => (
          <g key={dy} transform={`translate(${dx} ${dy})`}>
            <path d={TOP} fill={`url(#${id}-top)`} />
            <path d={FRONT} fill={`url(#${id}-front)`} />
            {/* Bevel: a hairline of light along the edge where the faces meet,
                and a darker one at the base to stop it dissolving into the card. */}
            <path d="M14 60 L94 60" stroke="#fff3cc" strokeOpacity=".7" strokeWidth="1" />
            <path d="M20 78 L88 78" stroke="#3d2309" strokeOpacity=".45" strokeWidth="1" />
            {/* The sheen is confined to the front face by reusing its outline. */}
            <path d={FRONT} fill={`url(#${id}-sheen)`} />
            {top && (
              <>
                {/* Stamp. Suggested, not legible — a fake serial number would be
                    worse than none, and the real one is on the bar we send. */}
                <g stroke="#4a2b0c" strokeOpacity=".3" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M26 67 h13" />
                  <path d="M69 67 h13" />
                </g>
                <text
                  x="54"
                  y="70"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  letterSpacing=".4"
                  fill="#4a2b0c"
                  fillOpacity=".5"
                >
                  999.9
                </text>
              </>
            )}
          </g>
        ))}
      </g>

      {lead && (
        /* One sparkle, clear of the metal, only on the headline tier. */
        <path
          d="M99 12 l1.9 5 5 1.9 -5 1.9 -1.9 5 -1.9 -5 -5 -1.9 5 -1.9 Z"
          fill="#f4df9c"
          opacity=".85"
        />
      )}
    </svg>
  );
}

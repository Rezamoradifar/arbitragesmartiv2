import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { EcosystemVisual } from "@/components/visuals/FeatureVisuals";
import { VisualFrame } from "@/components/visuals/primitives";
import { REFERRAL_LEVELS } from "@/lib/contract";

export const metadata: Metadata = {
  title: "Gold rewards",
  description:
    "Physical gold for the builders who bring real volume. Thresholds and round dates are being finalised.",
};

/**
 * The prize ladder. Weights only, on purpose.
 *
 * The qualifying volume behind each tier is still being set, and publishing a
 * provisional figure would be worse than publishing none: people would plan
 * around it and we would be moving the finish line on them later. The weights
 * are settled, so those are what the page shows until the rest is fixed.
 */
const TIERS = [1, 5, 10, 25, 50, 100, 250, 500, 1000].map((grams) => ({
  grams,
  label: grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`,
}));

/** The four shown as cards; the whole ladder is listed below them. */
const HIGHLIGHT = [1, 50, 250, 1000];

const CONDITIONS = [
  {
    n: "01",
    title: "The number that counts is your whole team",
    body: "All three levels, added together: the people you referred, the people they referred, and one level below that. It is the sum of the three values getTeamVolume returns for your address, and it is the same total your dashboard shows. Nothing is weighted or discounted by depth — a dollar on level three counts exactly like a dollar on level one.",
  },
  {
    n: "02",
    title: "Recorded stake, not deposits",
    body: "A deposit records the amount left after the entry fee, and it is that net figure which counts. It is the same number your dashboard shows, so there is nothing to reconcile.",
  },
  {
    n: "03",
    title: "It is measured at one moment, announced in advance",
    body: "Each round has a closing date fixed before it opens, and a block number published shortly before it. Every balance is read at that block. Not the peak you reached, not an average — the value at that block. A snapshot is the only rule that cannot be argued with afterwards, because anyone can replay it.",
  },
  {
    n: "04",
    title: "Volume that left does not count",
    body: "When anyone in your three levels exits, their stake stops counting toward your team total the same day, exactly as it stops counting toward your referral tier. Building volume that stays is the point.",
  },
  {
    n: "05",
    title: "You need an active position of your own",
    body: "At the snapshot block your own stake has to be active, and above a minimum that will be published with the thresholds. The programme rewards people building alongside the protocol, not routing around it.",
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
            Build a team that stakes and stays, and we send you metal. It is measured on your whole
            team, three levels deep — a number the contract already publishes, so you can check
            where you stand at any moment without asking us.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">
              See your team volume
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
        <p className="eyebrow">
          <Icon name="clock" className="h-3.5 w-3.5" />
          Being finalised
        </p>
        <h2 className="h-section mt-4">Thresholds and dates are still being set</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          The rewards themselves are decided — the bars below are what the programme pays. What is
          not settled yet is how much team volume each one takes and when the first round opens and
          closes. We would rather publish nothing than publish a figure people plan around and then
          move.
        </p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Everything goes up here first, complete and in one piece: the volume for every tier, the
          minimum stake of your own, the opening and closing dates, and the block the snapshot is
          read at. Nothing starts counting before that announcement.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="https://t.me/arbhub_site" target="_blank" rel="noreferrer" className="btn-primary">
            Get told when it opens
          </a>
          <a href="mailto:support@arbhub.site" className="btn-secondary">
            Ask a question
          </a>
        </div>
      </section>

      {/* --------------------------------------------------------- tiers */}
      <section>
        <h2 className="h-section">The rewards</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Nine tiers, from a single gram to a full kilo. Measured on your whole team, three levels
          deep — you receive the highest tier you clear.
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
                  <p className="text-xs uppercase tracking-wider text-graphite-500">Team volume</p>
                  <p className="mt-1 font-display text-lg font-semibold text-graphite-400">
                    Being set
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {TIERS.map((t) => (
            <span
              key={t.grams}
              className={`rounded-full border px-4 py-2 font-display text-sm font-semibold ${
                t.grams === 1000
                  ? "border-gold-400/40 bg-gold-400/[.08] text-gold-300"
                  : "border-white/[.08] bg-white/[.02] text-graphite-200"
              }`}
            >
              {t.label}
            </span>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-graphite-500">
          Bars are 999.9 fine, supplied with the refiner&apos;s assay certificate. Tiers do not stack
          — one bar per address per round, at the highest level you reach.
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
          Your team volume is on your dashboard, and it is the same number the contract returns to
          anyone who asks it. You do not have to take our figure for it:
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[.06] bg-graphite-950/70 p-4 font-mono text-xs leading-relaxed text-graphite-300">
{`cast call ${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS} \\
  "getTeamVolume(address)(uint256,uint256,uint256)" <YOUR_ADDRESS> \\
  --rpc-url https://polygon-rpc.com

# three values: level 1, level 2, level 3 — in USDT with 6 decimals
# add all three together; that sum is what a gold tier is measured on`}
        </pre>
        <p className="mt-4 text-xs leading-relaxed text-graphite-500">
          All three numbers count toward a gold tier. Your referral tier is a separate calculation
          and looks only at the first one — the two are measured differently on purpose.
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
        <h2 className="h-section mx-auto max-w-2xl">Start building now, not on the day</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-graphite-300">
          Your team volume is already being recorded on-chain, whatever the thresholds turn out to
          be, and the referral rewards above are live today — they pay every time your team claims.
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

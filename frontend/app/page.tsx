import Link from "next/link";
import { LiveStats } from "@/components/LiveStats";
import { Aurora, LiveDot } from "@/components/Aurora";
import { PLANS, PENALTY_SCHEDULE, REFERRAL_LEVELS, formatBps } from "@/lib/contract";

const securityPoints = [
  {
    title: "No owner withdrawal path",
    body: "There is no function that sends staked principal to a wallet. Fee wallets receive a fixed 10% of yield claims and a capped share of realized arbitrage profit — nothing else leaves the pool except to the staker who earned it.",
  },
  {
    title: "Partner override on the owner",
    body: "Up to four partners vote alongside the owner. Three of them can freeze the protocol and open withdrawals over the owner's objection. The owner holds one vote and cannot unpause out of it, nor reshuffle the voting body mid-vote.",
  },
  {
    title: "Stakers exit before any sweep",
    body: "Emergency fund rescue needs partner quorum plus a seven-day on-chain delay. Stakers' own no-penalty withdrawal opens on day two, five full days before a sweep can execute.",
  },
  {
    title: "Blacklisting cannot trap principal",
    body: "A blocked address is barred from new stakes and yield claims, but early exit and emergency withdrawal stay open. Principal is never frozen at anyone's discretion.",
  },
  {
    title: "Bounded, cumulative arbitrage exposure",
    body: "At most 20% of total assets, plus realized profit, may sit in Polymarket positions at once. The cap is cumulative, so repeated deployments cannot walk past it and drain liquidity.",
  },
  {
    title: "Audited-by-construction accounting",
    body: "76 tests including eight invariants run across 128,000 randomized calls per property, covering the referral ledger, the partner registry and the arbitrage capital tracker.",
  },
];

const planAccent = [
  "from-ink-700/60 to-ink-800/30",
  "from-brand-800/40 to-ink-800/30",
  "from-brand-700/45 to-ink-800/30",
  "from-brand-600/50 to-iris-900/30",
];

export default function HomePage() {
  return (
    <div className="space-y-28 pb-10">
      {/* ---------- Hero ---------- */}
      <section className="relative -mx-4 px-4 pb-8 pt-14 text-center sm:-mx-6 sm:px-6 sm:pt-24">
        <Aurora />

        <div className="animate-fade-up">
          <span className="eyebrow">
            <LiveDot />
            Live on Polygon
          </span>
        </div>

        <h1 className="animate-fade-up animate-delay-100 mx-auto mt-7 max-w-4xl font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-gradient">Staking with an exit</span>
          <br />
          <span className="text-gradient-brand">you don&apos;t have to trust</span>
          <br />
          <span className="text-gradient">anyone for</span>
        </h1>

        <p className="animate-fade-up animate-delay-200 mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ink-300">
          Fixed daily rewards and a four-level referral programme, settled entirely on-chain. Every
          control that could touch your principal is bounded, delayed, or put to a vote you can
          watch happen.
        </p>

        <div className="animate-fade-up animate-delay-300 mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Open dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link href="/security" className="btn-secondary">
            How your funds are protected
          </Link>
        </div>

        <p className="animate-fade-up animate-delay-500 mt-8 text-xs text-ink-400">
          Verified source · exact bytecode match · no owner withdrawal path
        </p>
      </section>

      {/* ---------- Live stats ---------- */}
      <LiveStats />

      {/* ---------- Plans ---------- */}
      <section>
        <SectionHead
          eyebrow="Plans"
          title="Pick a tier, or let your deposit pick it"
          lead="Your plan is chosen automatically from the amount you stake, and upgrades as you top up."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`card card-hover group flex flex-col bg-gradient-to-br ${planAccent[i]}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-white">{plan.name}</h3>
                <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-400">
                  Tier {i}
                </span>
              </div>

              <p className="mt-5 font-display text-4xl font-extrabold tracking-tight text-gradient-brand">
                {formatBps(plan.dailyBps)}
                <span className="ml-1 text-sm font-medium text-ink-400">/day</span>
              </p>

              <div className="divider my-5" />

              <dl className="space-y-2.5 text-sm">
                <Meta label="Minimum" value={`${plan.minStake.toLocaleString("en-US")} USDT`} />
                <Meta label="Term" value={`${plan.durationDays} days`} />
                <Meta
                  label="Gross over term"
                  value={`${((plan.dailyBps * plan.durationDays) / 100).toFixed(0)}%`}
                  strong
                />
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-ink-400">
          Gross figures are before the 10% fee applied to each claim. Rewards accrue per second and
          stop at the end of the plan term. These are contract parameters, not a forecast — the
          protocol does not guarantee it can sustain them.
        </p>
      </section>

      {/* ---------- Referral ---------- */}
      <section>
        <SectionHead
          eyebrow="Referrals"
          title="Four levels, paid from protocol fees"
          lead="Referral rewards come out of protocol fees on your referrals' claims — never deducted from their principal or their yield."
        />

        <div className="card mt-10 overflow-x-auto p-0">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.07] text-xs uppercase tracking-wider text-ink-400">
                <th className="px-6 py-4 font-medium">Level</th>
                <th className="px-6 py-4 font-medium">Requirement</th>
                <th className="px-6 py-4 text-right font-medium">Direct (F1)</th>
                <th className="px-6 py-4 text-right font-medium">Second (F2)</th>
                <th className="px-6 py-4 text-right font-medium">Third (F3)</th>
              </tr>
            </thead>
            <tbody>
              {REFERRAL_LEVELS.map((lvl) => (
                <tr
                  key={lvl.level}
                  className="border-b border-white/[.04] transition last:border-0 hover:bg-white/[.03]"
                >
                  <td className="px-6 py-4 font-display font-semibold text-white">{lvl.name}</td>
                  <td className="px-6 py-4 text-ink-300">
                    {lvl.needRefs === 0
                      ? "Any active stake"
                      : `${lvl.needRefs} referrals + ${lvl.needStake.toLocaleString("en-US")} USDT staked`}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold tabular-nums text-brand-300">
                    {formatBps(lvl.f1Bps)}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-ink-200">
                    {formatBps(lvl.f2Bps)}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-ink-200">
                    {lvl.f3Bps === 0 ? "—" : formatBps(lvl.f3Bps)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Security ---------- */}
      <section>
        <SectionHead
          eyebrow="Security"
          title="What stops the team from taking your money"
          lead="The honest version. Each of these is enforced by the contract, not by policy — read the verified source and check."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {securityPoints.map((f, i) => (
            <div key={f.title} className="card card-hover">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-500/10 font-display text-xs font-bold text-brand-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{f.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Early exit ---------- */}
      <section>
        <SectionHead
          eyebrow="Exit"
          title="Leaving early"
          lead="You can exit any time without asking permission. The penalty falls the longer you stay, and applies to principal only."
        />

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PENALTY_SCHEDULE.map((p, i) => (
            <div
              key={p.label}
              className="card card-hover p-5 text-center"
              style={{ opacity: 1 - i * 0.06 }}
            >
              <p className="text-xs uppercase tracking-wider text-ink-400">{p.label}</p>
              <p
                className={`mt-2 font-display text-3xl font-bold tabular-nums ${
                  i === 4 ? "text-brand-300" : "text-white"
                }`}
              >
                {formatBps(p.bps)}
              </p>
              <p className="mt-1 text-xs text-ink-400">penalty</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="card relative overflow-hidden py-14 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_120%_at_50%_0%,rgba(26,171,132,.22),transparent_70%)]"
        />
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to start?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">
          Connect a wallet on Polygon, approve USDT, and stake from 10 USDT. Rewards begin accruing
          immediately.
        </p>
        <Link href="/dashboard" className="btn-primary mt-8">
          Open dashboard
        </Link>
      </section>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 leading-relaxed text-ink-300">{lead}</p>
    </div>
  );
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums text-brand-300" : "tabular-nums text-ink-200"}>
        {value}
      </dd>
    </div>
  );
}

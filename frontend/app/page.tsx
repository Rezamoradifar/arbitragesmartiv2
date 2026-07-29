import Link from "next/link";
import { LiveStats } from "@/components/LiveStats";
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

export default function HomePage() {
  return (
    <div className="space-y-20 pb-10">
      {/* Hero */}
      <section className="pt-10 text-center sm:pt-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/60 px-3 py-1 text-xs font-medium text-brand-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />
          Live on Polygon
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-50 sm:text-6xl">
          Staking with an exit you don&apos;t have to trust anyone for
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Fixed daily rewards and a four-level referral programme, settled entirely on-chain.
          Every control that could touch your principal is bounded, delayed, or put to a vote you
          can watch happen.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Open dashboard
          </Link>
          <Link href="/security" className="btn-secondary">
            How your funds are protected
          </Link>
        </div>
      </section>

      {/* Live protocol stats */}
      <LiveStats />

      {/* Plans */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Staking plans</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your plan is chosen automatically from the amount you stake, and upgrades as you top up.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <div key={plan.name} className="card flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                <span className="text-xs text-slate-500">Tier {i}</span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-brand-400">
                {formatBps(plan.dailyBps)}
                <span className="text-base font-medium text-slate-500"> /day</span>
              </p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Minimum</dt>
                  <dd className="text-slate-200">{plan.minStake.toLocaleString("en-US")} USDT</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Term</dt>
                  <dd className="text-slate-200">{plan.durationDays} days</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Gross over term</dt>
                  <dd className="text-slate-200">
                    {((plan.dailyBps * plan.durationDays) / 100).toFixed(0)}%
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Gross figures are before the 10% fee applied to each claim. Rewards accrue per second and
          stop at the end of the plan term.
        </p>
      </section>

      {/* Referral programme */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Referral programme</h2>
        <p className="mt-2 text-sm text-slate-400">
          Referral rewards are paid from protocol fees on your referrals&apos; claims — never
          deducted from their principal or their yield.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="py-3 font-medium">Level</th>
                <th className="py-3 font-medium">Requirement</th>
                <th className="py-3 text-right font-medium">Direct (F1)</th>
                <th className="py-3 text-right font-medium">Second (F2)</th>
                <th className="py-3 text-right font-medium">Third (F3)</th>
              </tr>
            </thead>
            <tbody>
              {REFERRAL_LEVELS.map((lvl) => (
                <tr key={lvl.level} className="border-b border-slate-900">
                  <td className="py-3 font-medium text-slate-100">{lvl.name}</td>
                  <td className="py-3 text-slate-400">
                    {lvl.needRefs === 0
                      ? "Any active stake"
                      : `${lvl.needRefs} referrals + ${lvl.needStake.toLocaleString("en-US")} USDT staked`}
                  </td>
                  <td className="py-3 text-right text-brand-400">{formatBps(lvl.f1Bps)}</td>
                  <td className="py-3 text-right text-slate-200">{formatBps(lvl.f2Bps)}</td>
                  <td className="py-3 text-right text-slate-200">
                    {lvl.f3Bps === 0 ? "—" : formatBps(lvl.f3Bps)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">
          What stops the team from taking your money
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          The honest version. Each of these is enforced by the contract, not by policy — read the
          verified source and check.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {securityPoints.map((f) => (
            <div key={f.title} className="card">
              <h3 className="font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Early exit */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Leaving early</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          You can exit any time without asking permission. The penalty falls the longer you stay,
          and is applied to principal only.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {PENALTY_SCHEDULE.map((p) => (
            <div key={p.label} className="card text-center">
              <p className="text-xs text-slate-400">{p.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{formatBps(p.bps)}</p>
              <p className="mt-1 text-xs text-slate-500">penalty</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">Ready to start?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Connect a wallet on Polygon, approve USDT, and stake from 10 USDT. Rewards begin accruing
          immediately.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Open dashboard
        </Link>
      </section>
    </div>
  );
}

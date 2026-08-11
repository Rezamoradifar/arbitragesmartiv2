"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { Icon } from "@/components/Icon";
import { PLANS, REFERRAL_LEVELS, PENALTY_SCHEDULE, DEPOSIT_FEE_BANDS } from "@/lib/contract";

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? "https://arbhub.site";
const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const USDT = process.env.NEXT_PUBLIC_COLLATERAL_ADDRESS ?? "";

/**
 * The gross deposit that clears the minimum.
 *
 * The contract measures MIN_STAKE against the NET amount, so sending exactly
 * the minimum reverts — the fee comes off first. Everyone hits this once, and
 * the revert says nothing useful, so the number is worth printing.
 */
const MIN_GROSS = (() => {
  const worst = DEPOSIT_FEE_BANDS[DEPOSIT_FEE_BANDS.length - 1];
  return Math.ceil((10 / (1 - worst.bps / 10_000)) * 100) / 100;
})();

type TabId = "start" | "plans" | "team" | "safety";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "start", label: "How to join" },
  { id: "plans", label: "Plans" },
  { id: "team", label: "Referrals" },
  { id: "safety", label: "Safety" },
];

/* ------------------------------------------------------------ telegram sdk */

type TgWebApp = {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: { start_param?: string; user?: { first_name?: string } };
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  openLink?: (url: string, opts?: { try_instant_view?: boolean }) => void;
  HapticFeedback?: { selectionChanged: () => void };
};

function tg(): TgWebApp | undefined {
  return (globalThis as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

/* -------------------------------------------------------------------- page */

export default function MiniApp() {
  const [tab, setTab] = useState<TabId>("start");
  const [ref, setRef] = useState<string | null>(null);
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    const app = tg();
    if (!app) return;
    setInTelegram(true);
    app.ready();
    app.expand();
    // Keep Telegram's own header in the brand's colour rather than letting it
    // sit in the user's light theme above a dark page.
    app.setHeaderColor?.("#05060b");
    app.setBackgroundColor?.("#05060b");

    // t.me/<bot>/<app>?startapp=<address> arrives here, so a referral link
    // still carries its referrer through Telegram.
    const p = app.initDataUnsafe?.start_param;
    if (p && /^0x[a-fA-F0-9]{40}$/.test(p)) setRef(p);
  }, []);

  const joinUrl = useMemo(
    () => `${SITE}/dashboard${ref ? `?ref=${ref}` : ""}`,
    [ref],
  );

  function open(url: string) {
    const app = tg();
    if (app?.openLink) app.openLink(url);
    else window.open(url, "_blank", "noreferrer");
  }

  function pick(id: TabId) {
    setTab(id);
    tg()?.HapticFeedback?.selectionChanged();
  }

  return (
    <>
      {/* Telegram's SDK. Loaded through next/script so it is not blocking, and
          every call above is guarded — the page has to work when someone opens
          this URL in an ordinary browser too. */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />

      <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-6">
        {/* ------------------------------------------------------ header */}
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-gold-sheen shadow-gold"
            aria-hidden
          >
            <span className="h-3 w-3 rounded-[4px] bg-graphite-950" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight text-white">
              ARBI<span className="text-gold-gradient">SMART</span>
            </p>
            <p className="text-xs text-graphite-400">USDT staking on Polygon</p>
          </div>
        </div>

        {ref && (
          <div className="glass mt-4 flex items-start gap-2.5 border-gold-400/25 p-3">
            <Icon name="users" className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
            <p className="text-xs leading-relaxed text-graphite-300">
              You arrived through a referral link. It is carried into the app automatically —{" "}
              <span className="break-all font-mono text-[11px] text-graphite-200">{ref}</span>
            </p>
          </div>
        )}

        {/* -------------------------------------------------------- tabs */}
        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-gold-sheen text-graphite-950 shadow-gold"
                  : "border border-white/[.08] bg-white/[.02] text-graphite-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "start" && <HowToJoin />}
          {tab === "plans" && <Plans />}
          {tab === "team" && <Referrals />}
          {tab === "safety" && <Safety />}
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-graphite-500">
          Staking returns are settings in a contract, not a guarantee. Nothing here is financial
          advice.
        </p>
      </div>

      {/* ---------------------------------------------------- sticky CTA */}
      {/* Telegram's own MainButton would be the idiomatic control, but it is
          absent when the page is opened in a browser. One button that behaves
          the same in both places beats two code paths. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[.07] bg-graphite-950/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg gap-2">
          <button type="button" className="btn-primary flex-1" onClick={() => open(joinUrl)}>
            Open the app
            <Icon name="external" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => open(`${SITE}/security`)}
            aria-label="Security model"
          >
            <Icon name="shield" className="h-4 w-4" />
          </button>
        </div>
        {inTelegram && (
          <p className="mx-auto mt-2 max-w-lg text-center text-[11px] text-graphite-500">
            Opens in your browser. Connecting a wallet does not work reliably inside Telegram.
          </p>
        )}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- sections */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass p-4">{children}</div>;
}

function HowToJoin() {
  const steps = [
    {
      title: "Get a wallet",
      body: "MetaMask or Trust Wallet, on your phone. Write the recovery phrase on paper and keep it. Nobody from ArbiSmart will ever ask you for it — not support, not an admin, not anyone.",
    },
    {
      title: "Switch it to Polygon",
      body: "Not Ethereum, not BNB Chain. Both wallets have Polygon in their network list. Funds sent on the wrong network do not arrive and cannot be recovered by us.",
    },
    {
      title: "Get USDT on Polygon",
      body: `Buy it on an exchange and withdraw on the Polygon network, or bridge it. It has to be this exact token: ${USDT.slice(0, 10)}…${USDT.slice(-6)}. Any other token with "USDT" in the name will be rejected by the contract.`,
    },
    {
      title: "Keep a little POL for gas",
      body: "One or two POL is plenty for many transactions. Without it the network cannot process anything, even though your USDT is sitting right there.",
    },
    {
      title: "Open the app and connect",
      body: "Use the browser inside your wallet app, or a normal browser with the extension. Tap Connect and approve. We never see your keys and cannot move anything on your behalf.",
    },
    {
      title: "Approve, then stake",
      body: `Two transactions: approve the contract to spend your USDT, then stake. Send at least ${MIN_GROSS} USDT — the entry fee comes off first and the contract measures the minimum against what is left, so exactly 10 will be rejected.`,
    },
    {
      title: "Claim when you like",
      body: "Yield accrues every second and you decide when to take it. There is no schedule to keep and no penalty for leaving it to build.",
    },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <h2 className="font-display text-base font-semibold text-white">
          Seven steps, about ten minutes
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-graphite-300">
          If you have never used a wallet before, steps one to four are the slow part. Everything
          after that takes two minutes.
        </p>
      </Card>

      {steps.map((s, i) => (
        <div key={s.title} className="glass p-4">
          <div className="flex items-start gap-3">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${
                i === steps.length - 1
                  ? "bg-gold-sheen text-graphite-950"
                  : "border border-white/10 bg-white/[.04] text-graphite-200"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-graphite-300">{s.body}</p>
            </div>
          </div>
        </div>
      ))}

      <Card>
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-warn-400">
          <Icon name="info" className="h-4 w-4" />
          Three things that will cost you money
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-graphite-300">
          <li>· Sending USDT on the wrong network. It does not arrive and we cannot get it back.</li>
          <li>· Giving anyone your recovery phrase. There is no support case where this is needed.</li>
          <li>
            · Using a link someone sent you in a private message. Only{" "}
            <span className="text-graphite-100">arbhub.site</span> and{" "}
            <span className="text-graphite-100">@arbhub_site</span> are ours.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Plans() {
  return (
    <div className="space-y-3">
      {PLANS.map((p, i) => (
        <div key={p.name} className={`glass p-4 ${i === PLANS.length - 1 ? "glass-gold" : ""}`}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-white">{p.name}</h3>
            <span
              className={`font-display text-xl font-bold ${
                i === PLANS.length - 1 ? "text-gold-gradient" : "text-gold-300"
              }`}
            >
              {(p.dailyBps / 100).toFixed(2)}%
              <span className="ml-1 text-[11px] font-medium text-graphite-400">/ day</span>
            </span>
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-graphite-400">
            <span>
              From{" "}
              <span className="text-graphite-100">
                {p.minStake.toLocaleString("en-US")} USDT
              </span>
            </span>
            <span>
              <span className="text-graphite-100">{p.durationDays}</span> days
            </span>
          </div>
        </div>
      ))}

      <Card>
        <h3 className="font-display text-sm font-semibold text-white">Every fee, in full</h3>
        <div className="mt-2.5 space-y-1.5 text-xs">
          {/* The table is stored biggest-first so the lookup can take the first
              match; reading it is easier the other way round. */}
          {[...DEPOSIT_FEE_BANDS].reverse().map((b, i, all) => (
            <div key={b.bps} className="flex justify-between text-graphite-300">
              <span>
                {b.from === 0
                  ? `Under ${(all[i + 1]?.from ?? 500).toLocaleString("en-US")} USDT`
                  : `From ${b.from.toLocaleString("en-US")} USDT`}
              </span>
              <span className="font-mono text-graphite-100">{b.bps / 100}%</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/[.06] pt-1.5 text-graphite-300">
            <span>Claim fee</span>
            <span className="font-mono text-graphite-100">10% · 5% on Advanced &amp; Elite</span>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-graphite-500">
          That is the complete list. The claim fee is charged on yield only, never on principal, and
          the schedule is compiled into the contract with no function to change it.
        </p>
      </Card>
    </div>
  );
}

function Referrals() {
  return (
    <div className="space-y-3">
      <Card>
        <h2 className="font-display text-base font-semibold text-white">
          Three levels, paid from the claim
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-graphite-300">
          When someone in your team claims, your share is deducted from that claim. Never from their
          principal, and never minted from nothing — which is the difference between this and a
          programme funded by the next deposit.
        </p>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-white/[.07]">
        <table className="w-full min-w-[22rem] text-xs">
          <thead>
            <tr className="border-b border-white/[.07] bg-white/[.02] text-left">
              <th className="px-3 py-2.5 font-medium text-graphite-400">Tier</th>
              <th className="px-3 py-2.5 text-right font-medium text-graphite-400">L1</th>
              <th className="px-3 py-2.5 text-right font-medium text-graphite-400">L2</th>
              <th className="px-3 py-2.5 text-right font-medium text-graphite-400">L3</th>
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
                <td className="px-3 py-2.5 font-display font-semibold text-white">{l.name}</td>
                <td className="px-3 py-2.5 text-right font-mono text-graphite-100">
                  {l.f1Bps / 100}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-graphite-200">
                  {l.f2Bps / 100}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-graphite-300">
                  {l.f3Bps === 0 ? "—" : `${l.f3Bps / 100}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <h3 className="font-display text-sm font-semibold text-white">What a tier costs</h3>
        <div className="mt-2.5 space-y-2">
          {REFERRAL_LEVELS.filter((l) => l.level > 0).map((l) => (
            <div key={l.level} className="text-xs text-graphite-300">
              <span className="font-display font-semibold text-graphite-100">{l.name}</span> —{" "}
              {l.needStake.toLocaleString("en-US")} staked yourself,{" "}
              {l.needVolume.toLocaleString("en-US")} USDT direct volume, {l.needRefs} active
              referrals.
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-graphite-500">
          All three at once, not any one of them. Twenty-five small wallets will not reach Platinum
          and neither will a single large one.
        </p>
      </Card>
    </div>
  );
}

function Safety() {
  return (
    <div className="space-y-3">
      <Card>
        <h2 className="font-display text-base font-semibold text-white">You can always leave</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-graphite-300">
          Early exit is open at every moment, including while the protocol is paused and including
          if your address has been blacklisted. It costs a share of accrued yield, and your
          principal is never part of that calculation.
        </p>
        <div className="mt-3 flex gap-1.5">
          {PENALTY_SCHEDULE.map((p) => (
            <div key={p.label} className="flex-1 rounded-lg border border-white/[.07] bg-white/[.02] py-2 text-center">
              <div className="font-display text-sm font-bold text-gold-300">{p.bps / 100}%</div>
              <div className="mt-0.5 text-[10px] text-graphite-500">
                {p.label.replace("Week ", "W")}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-sm font-semibold text-success-400">The owner cannot</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-graphite-300">
          <li>· Withdraw principal to a wallet. No such function exists, at any size, under any name.</li>
          <li>· Spend collected fees as if they were pool capital.</li>
          <li>· Raise the fee after you have deposited.</li>
          <li>· Move funds without three of five partner votes and a 48-hour delay.</li>
        </ul>
      </Card>

      <Card>
        <h3 className="font-display text-sm font-semibold text-white">Check it yourself</h3>
        <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-graphite-300">
          {CONTRACT}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-graphite-500">
          Polygon mainnet. Source verified on Sourcify with an exact match on both creation and
          runtime bytecode. The full security page lists the known limitations too, including the
          ones that do not flatter us.
        </p>
      </Card>
    </div>
  );
}

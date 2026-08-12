"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { Icon } from "@/components/Icon";
import { ERC20_ABI, COLLATERAL_ADDRESS } from "@/lib/contract";
import { CopyButton } from "@/components/CopyButton";
import { BuyWithCard } from "@/components/BuyWithCard";

/**
 * Getting the right token onto the right chain is the single hardest step for
 * a new depositor, and the contract cannot help: collateralToken is immutable
 * and stake() carries onlyEOA, so there is no router that could accept some
 * other asset and convert it on the way in. Every fix has to happen in the
 * user's wallet before they ever reach the deposit screen — which makes this
 * page the fix.
 */

/** Tokens on Polygon a newcomer is most likely to be holding by mistake. */
const POLYGON_TOKENS = [
  {
    key: "usdt",
    symbol: "USDT",
    address: COLLATERAL_ADDRESS,
    decimals: 6,
    note: "This is the one the contract takes.",
    ok: true,
  },
  {
    key: "usdc",
    symbol: "USDC",
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const,
    decimals: 6,
    note: "Native Circle USDC. One swap away, and the rate is near 1:1.",
    ok: false,
  },
  {
    key: "usdce",
    symbol: "USDC.e",
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as const,
    decimals: 6,
    note: "The older bridged USDC. Also one swap away.",
    ok: false,
  },
  {
    key: "dai",
    symbol: "DAI",
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" as const,
    decimals: 18,
    note: "Swaps to USDT on Polygon with very little slippage.",
    ok: false,
  },
] as const;

const JUMPER = `https://jumper.exchange/?toChain=137&toToken=${COLLATERAL_ADDRESS}`;

/**
 * The converter is a large bundle and most visitors are only reading. It is
 * loaded when somebody asks for it, not on every page view, and never on the
 * server — it touches window during module evaluation.
 */
const SwapWidget = dynamic(() => import("@/components/SwapWidget"), {
  ssr: false,
  loading: () => (
    <div className="glass grid h-[36rem] place-items-center p-6 text-sm text-graphite-400">
      Loading the converter…
    </div>
  ),
});

const ROUTES = [
  {
    n: "01",
    title: "You already hold USDT, but on another chain",
    body: "TRON, BNB Chain, Ethereum, Arbitrum — it does not matter which. A bridge moves it to Polygon in one transaction and usually lets you take a small amount of POL for gas out of the same trade. This is the most common situation and the easiest to fix.",
    action: { label: "Bridge to Polygon", href: JUMPER },
  },
  {
    n: "02",
    title: "You hold USDC, USDC.e or DAI on Polygon",
    body: "You are already on the right chain with the wrong token. A single swap fixes it, and between stablecoins the rate is close enough to 1:1 that the network fee is the larger cost.",
    action: { label: "Swap to USDT", href: JUMPER },
  },
  {
    n: "03",
    title: "You hold POL and nothing else",
    body: "Swap most of it to USDT and keep one or two POL behind for gas. Do not swap the lot — with a zero POL balance the network cannot process anything, however much USDT is sitting in the wallet.",
    action: { label: "Swap POL to USDT", href: JUMPER },
  },
  {
    n: "04",
    title: "You are starting from nothing",
    body: "Buy any major asset wherever you normally buy crypto, withdraw it to your own wallet, then use route 01. Which venue you use is up to you and depends on where you are — we do not take custody at any point and never see the funds until they reach the contract.",
    action: null,
  },
];

export default function GetUsdtPage() {
  const { address, isConnected } = useAccount();
  const [showSwap, setShowSwap] = useState(false);

  const { data: native } = useBalance({ address, query: { enabled: Boolean(address) } });

  const { data: balances } = useReadContracts({
    contracts: POLYGON_TOKENS.map((t) => ({
      address: t.address as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: [address as `0x${string}`],
    })),
    query: { enabled: Boolean(address), refetchInterval: 20_000 },
  });

  const held = useMemo(
    () =>
      POLYGON_TOKENS.map((t, i) => {
        const raw = (balances?.[i]?.result as bigint | undefined) ?? 0n;
        return { ...t, raw, amount: Number(formatUnits(raw, t.decimals)) };
      }),
    [balances],
  );

  const usdt = held.find((t) => t.key === "usdt");
  const swappable = held.filter((t) => !t.ok && t.amount > 0.5);
  const pol = native ? Number(formatUnits(native.value, native.decimals)) : 0;

  /** The one sentence that matters, given what is actually in the wallet. */
  const verdict = !isConnected
    ? null
    : (usdt?.amount ?? 0) >= 11.37 && pol >= 0.2
      ? { tone: "ok" as const, text: "You are ready. You hold enough USDT on Polygon and enough POL for gas." }
      : (usdt?.amount ?? 0) >= 11.37
        ? { tone: "warn" as const, text: "You have the USDT but almost no POL. Without gas the network cannot process the transaction — get one or two POL first." }
        : swappable.length > 0
          ? { tone: "warn" as const, text: `You are on the right chain with the wrong token. Swap your ${swappable.map((t) => t.symbol).join(" or ")} to USDT and you are done.` }
          : { tone: "warn" as const, text: "Nothing usable found on Polygon for this address. Start at route 01 below." };

  return (
    <div className="container-page space-y-14 py-10 sm:space-y-16 sm:py-14">
      {/* ---------------------------------------------------------- hero */}
      <section>
        <p className="eyebrow">
          <Icon name="wallet" className="h-3.5 w-3.5" />
          Funding
        </p>
        <h1 className="h-display mt-5">
          Getting <span className="text-gold-gradient">USDT on Polygon</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-graphite-300">
          The contract accepts one token on one chain, and that is not something we can widen —
          the address was fixed when it was deployed and there is no function to change it. Which
          means the whole problem is solved in your wallet, before you ever open the deposit screen.
        </p>
      </section>

      {/* ------------------------------------------------- the exact token */}
      <section className="glass glass-gold p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-white">
          The only token the contract accepts
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 break-all rounded-xl border border-white/[.07] bg-graphite-950/70 px-4 py-3 font-mono text-xs text-graphite-200">
            {COLLATERAL_ADDRESS}
          </code>
          <CopyButton value={COLLATERAL_ADDRESS} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-graphite-300">
          Tether on Polygon, six decimals, on-chain symbol USDT0. Several other tokens on Polygon
          also call themselves USDT — the contract will reject every one of them. Paste this address
          into your wallet or your exchange withdrawal screen rather than picking from a list.
        </p>
      </section>

      {/* ------------------------------------------------- wallet check-up */}
      <section>
        <h2 className="h-section">What is in your wallet right now</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Connect and this reads your Polygon balances directly from the chain. It tells you which
          of the routes below is yours, so you do not have to guess.
        </p>

        {!isConnected ? (
          <div className="glass mt-7 p-6 text-sm text-graphite-400">
            Connect a wallet to see your balances. Nothing is sent anywhere — the page reads public
            chain data and that is all.
          </div>
        ) : (
          <>
            {verdict && (
              <div
                className={`glass mt-7 flex items-start gap-3 p-5 ${
                  verdict.tone === "ok" ? "border-success-400/30" : "border-warn-400/30"
                }`}
              >
                <Icon
                  name={verdict.tone === "ok" ? "check" : "info"}
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    verdict.tone === "ok" ? "text-success-400" : "text-warn-400"
                  }`}
                />
                <p className="text-sm leading-relaxed text-graphite-200">{verdict.text}</p>
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="glass p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-semibold text-white">POL</span>
                  <span className="font-display text-lg font-bold tabular-nums text-graphite-100">
                    {pol.toFixed(3)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-graphite-400">
                  Gas. One or two is plenty for many transactions; zero means nothing can be sent at
                  all.
                </p>
              </div>

              {held.map((t) => (
                <div key={t.key} className={`glass p-5 ${t.ok ? "glass-gold" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display font-semibold text-white">{t.symbol}</span>
                    <span
                      className={`font-display text-lg font-bold tabular-nums ${
                        t.ok ? "text-gold-gradient" : "text-graphite-100"
                      }`}
                    >
                      {t.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-graphite-400">{t.note}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ------------------------------------------------------ converter */}
      <section id="convert" className="scroll-mt-24">
        <h2 className="h-section">Convert anything, right here</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Any token on any of the major chains, out the other side as USDT on Polygon. Pick what you
          are holding and where it is; the destination is already set.
        </p>

        {showSwap ? (
          <div className="mt-7 flex justify-center">
            <SwapWidget />
          </div>
        ) : (
          <button type="button" className="btn-primary mt-7" onClick={() => setShowSwap(true)}>
            Open the converter
            <Icon name="arrowDown" className="h-4 w-4" />
          </button>
        )}

        <div className="glass mt-5 flex items-start gap-3 p-5">
          <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-success-400" />
          <p className="text-sm leading-relaxed text-graphite-300">
            <span className="font-semibold text-white">Nothing passes through us.</span> The
            converter routes across public liquidity and you sign every transaction from your own
            wallet — ArbiSmart never holds the funds at any point in the trade, and could not take
            them if it wanted to. Rates, routes and fees come from the aggregator, not from us, and
            we earn nothing on the conversion. Check the quote and the destination on the widget&apos;s
            own screen before you confirm.
          </p>
        </div>

        {/* Everyone meets this once, and the widget's own message lists four
            possible causes without saying which one applies. */}
        <div className="glass mt-4 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display font-semibold text-warn-400">
            <Icon name="info" className="h-5 w-5" />
            If it says &ldquo;No routes available&rdquo;
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-graphite-300">
            Almost always the <span className="text-graphite-100">Get gas</span> toggle. With it on,
            the aggregator has to find one bridge that delivers both your USDT and a little POL in
            the same transaction, and far fewer bridges can do that — on small amounts, none of
            them. Turn it off and the same trade usually routes immediately.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                t: "Turn off Get gas",
                b: "Then handle gas separately — bridge the USDT first, then swap a dollar of it for POL on Polygon.",
              },
              {
                t: "Send more than a few dollars",
                b: "Bridge fees are close to fixed, so tiny amounts get eaten by them. Anything under about 5 USDT struggles to route at all.",
              },
              {
                t: "Leave headroom",
                b: "Sending your entire balance leaves nothing for the fee on the source chain. Keep a little back.",
              },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
                <p className="font-display text-sm font-semibold text-white">{x.t}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-graphite-400">{x.b}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-graphite-500">
            Worth knowing before you start: the smallest deposit the contract accepts is 11.37 USDT
            sent, so there is no point bridging less than that if staking is the plan.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- routes */}
      <section>
        <h2 className="h-section">Or do it your own way</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-300">
          Find the one that describes you. All of them end in the same place: USDT on Polygon, in a
          wallet you control.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {ROUTES.map((r) => (
            <div key={r.n} className="glass flex flex-col p-6">
              <div className="flex items-start gap-4">
                <span className="font-display text-2xl font-bold text-graphite-700">{r.n}</span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-white">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-300">{r.body}</p>
                </div>
              </div>
              {r.action && (
                <a
                  className="btn-secondary mt-5 self-start"
                  href={r.action.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.action.label}
                  <Icon name="external" className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-graphite-500">
          Those buttons open Jumper, a third-party bridge aggregator, with Polygon USDT preselected
          as the destination. It is not ours, we earn nothing from it, and we have no control over
          it — check the destination address on its own screen before you sign anything. Any bridge
          you already trust works just as well; the destination is what matters.
        </p>
      </section>

      {/* ------------------------------------------------- buy with a card */}
      {/* After the swap routes, because someone arriving with crypto already
          has a cheaper path. This is for the visitor who has none at all,
          which is the case the rest of the page cannot help with. */}
      <section className="glass p-6 sm:p-8">
        <BuyWithCard />
      </section>

      {/* ---------------------------------------------------------- gas */}
      <section className="glass p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-white">Do not forget the gas</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Polygon charges fees in POL, not USDT. A wallet holding a thousand USDT and no POL cannot
          send a single transaction — and this catches almost everyone once. Most bridges will
          deliver a small amount of POL alongside your USDT if you ask for it; take that option. A
          couple of POL covers many transactions.
        </p>
      </section>

      {/* -------------------------------------------------------- closing */}
      <section className="glass glass-gold p-7 text-center sm:p-10">
        <h2 className="h-section mx-auto max-w-2xl">Once it lands, you are two taps away</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-graphite-300">
          Approve, then stake. The minimum is 11.37 USDT sent — the entry fee comes off first and the
          contract measures the minimum against what is left.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Go to the dashboard
          </Link>
          <a href="mailto:support@arbhub.site" className="btn-secondary">
            Stuck? Email support
          </a>
        </div>
      </section>
    </div>
  );
}

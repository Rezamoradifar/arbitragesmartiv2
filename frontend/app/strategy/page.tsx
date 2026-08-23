import type { Metadata } from "next";
import Link from "next/link";
import { StrategyTruth } from "@/components/StrategyTruth";
import { TheArithmetic } from "@/components/TheArithmetic";
import { ArbitrageScanner } from "@/components/ArbitrageScanner";
import { TradingBotStatus } from "@/components/TradingBotStatus";
import { CexPriceTicker } from "@/components/CexPriceTicker";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "The strategy",
  description:
    "What the Polymarket arbitrage engine can and cannot do, what it has done so far, and where the yield actually comes from today.",
};

const CAN = [
  {
    title: "Split collateral into a complete set",
    body: "One dollar becomes one YES token and one NO token of the same market, through a direct call to Polymarket's permissionless Conditional Tokens contract.",
  },
  {
    title: "Merge a set back to collateral",
    body: "The reverse, at any time before the market resolves. Used to unwind a position rather than to realise a gain.",
  },
  {
    title: "Redeem after a market resolves",
    body: "Once the outcome is settled, the winning tokens are exchanged for collateral. Fully autonomous and fully on-chain.",
  },
];

export default function StrategyPage() {
  return (
    <div className="container-page space-y-14 py-16">
      <div className="max-w-3xl">
        <h1 className="h-page">The strategy, without the marketing</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-graphite-300">
          The site describes a Polymarket arbitrage engine. This page sets out exactly what that
          engine is able to do, what it has actually done, and where the yield is coming from in the
          meantime. Every figure is read from the contract, including the ones that do not flatter
          us.
        </p>
      </div>

      {/* --------------------------------------------------- live figures */}
      <StrategyTruth />

      {/* ------------------------------------------------- the scanner */}
      <ArbitrageScanner />

      {/* --------------------------------------- the execution bot's status */}
      <TradingBotStatus />

      {/* ------------------------------------ CEX price reference (not the protocol) */}
      <section>
        <h2 className="h-section">A different kind of arbitrage — CEX prices, for reference</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          This is the classic buy-low-sell-high spread between two centralized exchanges, streamed
          live from their own public order books. It has nothing to do with the Polymarket engine
          above, and the contract cannot act on it — there is no Binance or KuCoin key anywhere in
          this system. It is shown because visitors ask about it, and the honest answer is a live
          number, not a claim.
        </p>
        <div className="mt-8">
          <CexPriceTicker />
        </div>
      </section>

      {/* ------------------------------------------------- the arithmetic */}
      <section>
        <h2 className="h-section">The arithmetic, in full</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Anyone can work this out from the rates and fees we publish. Doing it here first, with the
          live figures, is the only version of this page that is worth reading.
        </p>
        <div className="mt-8">
          <TheArithmetic />
        </div>
      </section>

      {/* ------------------------------------------------ what it can do */}
      <section>
        <h2 className="h-section">What the contract can do</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-graphite-300">
          Three operations, all of them real calls to Polymarket&apos;s own deployed contracts. The
          events for each are emitted only after the external call has already succeeded, so an
          event on-chain means the action genuinely happened.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {CAN.map((c) => (
            <div key={c.title} className="glass p-5">
              <Icon name="check" className="h-5 w-5 text-volt-300" />
              <h3 className="mt-3 font-display text-sm font-semibold text-white">{c.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-graphite-400">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------- what it cannot do */}
      <section>
        <h2 className="h-section">What it cannot do, and why that matters</h2>
        <div className="glass mt-7 space-y-5 p-6 sm:p-8">
          <p className="text-[15px] leading-relaxed text-graphite-200">
            The contract cannot buy or sell on Polymarket&apos;s order book. This is not a feature
            we have not got round to — it is a permission Polymarket does not grant.
          </p>
          <p className="text-sm leading-relaxed text-graphite-300">
            Polymarket&apos;s own <span className="font-mono text-xs">CTFExchange.fillOrder</span>,{" "}
            <span className="font-mono text-xs">fillOrders</span> and{" "}
            <span className="font-mono text-xs">matchOrders</span> are gated behind an{" "}
            <span className="font-mono text-xs">onlyOperator</span> modifier in their deployed
            source. Only addresses their admins have explicitly granted the Operator role may call
            them, and that role is not given to arbitrary third-party contracts. Ours does not have
            it.
          </p>

          <div className="rounded-xl border border-gold-400/20 bg-gold-400/[.06] p-5">
            <p className="text-sm font-semibold text-gold-200">Why that removes the profit</p>
            <p className="mt-2 text-sm leading-relaxed text-graphite-200">
              A complete set always costs exactly one dollar to create and always returns exactly
              one dollar when redeemed. The profit in this kind of arbitrage comes from buying a set
              for less than a dollar, or selling the outcomes for more — and both of those are
              order-book trades. Split and redeem on their own, which is what the contract can do
              unaided, net to zero before gas.
            </p>
          </div>

          <p className="text-sm leading-relaxed text-graphite-300">
            There is a supported route to closing this gap: an off-chain component using
            Polymarket&apos;s CLOB API, together with the contract implementing EIP-1271 so it can
            act as a smart-contract order maker. It is deliberately not implemented, because getting
            the signature validation wrong is worse than not shipping it. Until it is built and
            verified, the engine cannot trade.
          </p>

          <p className="text-xs leading-relaxed text-graphite-500">
            All of this is written into the contract&apos;s own source under the heading “IMPORTANT,
            HONEST LIMITATION”, which is published and verified on Sourcify. You do not have to take
            this page&apos;s word for any of it.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- closing */}
      <section className="glass p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-white">Why publish this</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-graphite-300">
          Because you would find it anyway — the numbers are on-chain and the limitation is in the
          source. A project that only publishes the figures that flatter it has told you nothing
          about the figures it did not publish. When the strategy does start, its results will
          appear on this page from the same contract reads, and they will be worth something
          precisely because these ones were shown first.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/security" className="btn-secondary">
            What the owner can and cannot do
          </Link>
          <Link href="/activity" className="btn-secondary">
            Every transaction, live
          </Link>
        </div>
      </section>
    </div>
  );
}

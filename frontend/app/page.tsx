import Link from "next/link";
import { MarketTerminal } from "@/components/MarketTerminal";
import { ArbitrageScanner } from "@/components/ArbitrageScanner";
import { PolymarketMarkets } from "@/components/PolymarketMarkets";
import { LiveStats } from "@/components/LiveStats";
import { VerificationCenter } from "@/components/VerificationCenter";
import { DepositCalculator } from "@/components/DepositCalculator";
import { FaqList } from "@/components/FaqList";
import { MarketNews } from "@/components/MarketNews";
import { NewsFeed } from "@/components/NewsFeed";
import { Icon } from "@/components/Icon";
import { PLANS, grossForNet } from "@/lib/contract";

const faqs = [
  {
    q: "Are these spreads actual ArbiSmart trades?",
    a: "No. The exchange monitor compares public bid and ask quotes. The Polymarket scanner reports observed opportunities. Executed protocol transactions are listed separately on the activity page, and realized strategy profit comes from the contract.",
  },
  {
    q: "What does “after assumed fees” mean?",
    a: "The monitor starts with a 10-basis-point (0.10%) fee on each leg. You can change that assumption. Account-specific fees, available depth, slippage, transfers and settlement risk are not included, so a positive indication is not a guaranteed profit.",
  },
  {
    q: "What does a deposit cost?",
    a: "The deposit fee falls with size: 12% below 500 USDT, 10% from 500, 7% from 2,500, and 5% from 10,000. Your stake is the amount remaining after this fee. Claims carry a separate fee of 10%, or 5% on Advanced and Elite. The deposit screen shows the split before you sign.",
  },
  {
    q: "What are the risks and exit rules?",
    a: "Quoted daily rates are contract parameters, not guaranteed returns. Payments depend on available pool liquidity. Early exit deducts 50% of principal in week one, 40% in week two, 30% in week three, 20% in week four, and 10% from week five; unclaimed yield is forfeited. Review the current balance sheet and security model before depositing.",
  },
  {
    q: "Where can I check licenses or registration?",
    a: "The documents section displays company documents only when supplied, with their issuer and verification link. No company registration or financial authorization documents are currently published here. Source-code verification is a separate technical check and does not establish regulatory approval.",
  },
];

export default function Home() {
  return (
    <div className="market-home">
      <MarketTerminal />
      <section className="container-page pb-16" id="prediction-markets">
        <div className="section-label">
          <span>02 / PREDICTION MARKETS</span>
          <Link href="/polymarket">OPEN POLYMARKET LIVE <Icon name="external" className="h-3 w-3" /></Link>
        </div>
        <ArbitrageScanner />
        <div className="mt-10">
          <PolymarketMarkets />
        </div>
      </section>
      <section className="protocol-section py-16" id="protocol">
        <div className="container-page">
          <div className="section-label">
            <span>03 / ON-CHAIN PROTOCOL</span>
            <Link href="/activity">
              VIEW ACTIVITY <Icon name="external" className="h-3 w-3" />
            </Link>
          </div>
          <LiveStats />
          <div className="protocol-note">
            <Icon name="info" className="h-4 w-4 shrink-0" />
            <p>
              Market monitoring and protocol performance are separate. Rates are
              not guaranteed; payouts depend on available capital and realized
              earnings.{" "}
              <Link href="/strategy">View the strategy and funding model</Link>.
            </p>
          </div>
        </div>
      </section>
      <VerificationCenter />
      <section className="container-page py-16" id="plans">
        <div className="section-label">
          <span>05 / EXPLORE YOUR OPTIONS</span>
          <span>POLYGON · USDT</span>
        </div>
        <div className="market-section-heading">
          <div>
            <h2>Your position. The full picture.</h2>
            <p>
              Contract terms, entry fees and withdrawal costs, before you
              connect.
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary !px-4 !py-2.5">
            Open dashboard <Icon name="external" className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="plan-summary-grid">
          {PLANS.map((p, i) => (
            <article
              key={p.name}
              className={`plan-summary glass ${i === 3 ? "glass-gold" : ""}`}
            >
              <span className="document-type">PLAN 0{i + 1}</span>
              <h3>{p.name}</h3>
              <div className="plan-rate">
                {(p.dailyBps / 100).toFixed(2)}
                <span>% / day</span>
              </div>
              <p>Contract rate · not guaranteed</p>
              <dl>
                <div>
                  <dt>Net stake from</dt>
                  <dd>{p.minStake.toLocaleString("en-US")} USDT</dd>
                </div>
                <div>
                  <dt>Deposit to reach tier</dt>
                  <dd>
                    {grossForNet(p.minStake).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    USDT
                  </dd>
                </div>
                <div>
                  <dt>Term</dt>
                  <dd>{p.durationDays} days</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <p className="market-footnote">
          Entry fee: 12–5% by deposit size. Claim fee: 10%, or 5% for Advanced
          and Elite. Early exit deducts 50–10% of principal and forfeits
          unclaimed yield. Review the exact quote in the dashboard.
        </p>
        <details className="calculator-disclosure glass mt-6">
          <summary>
            Calculate the deposit, fees and recorded stake{" "}
            <Icon name="plus" className="h-4 w-4" />
          </summary>
          <div className="p-5 sm:p-8">
            <DepositCalculator />
          </div>
        </details>
      </section>
      <section className="container-page py-16">
        <div className="section-label">
          <span>06 / THE LATEST</span>
          <span>FROM THE MARKET & THE PROJECT</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <MarketNews />
          <NewsFeed />
        </div>
      </section>
      <section className="container-page py-16">
        <div className="faq-layout">
          <div>
            <span className="eyebrow">A LITTLE MORE CLARITY</span>
            <h2 className="h-section mt-5">
              Good questions.
              <br />
              Straight answers.
            </h2>
            <p className="mt-4 text-sm text-graphite-300">
              Understand the numbers and what sits behind them.
            </p>
            <Link href="/security" className="scanner-link mt-6">
              Read the security model{" "}
              <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-45" />
            </Link>
          </div>
          <FaqList items={faqs} />
        </div>
      </section>
      <section className="container-page pb-20">
        <div className="closing-panel glass glass-gold">
          <div>
            <span className="eyebrow !border-0 !bg-transparent !p-0">
              STAY CLOSE TO THE MARKET
            </span>
            <h2>A clearer view starts here.</h2>
            <p>Explore the data. Check the source. Make your own decision.</p>
          </div>
          <a href="#live-markets" className="btn-primary">
            Back to live markets <Icon name="arrowUp" className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

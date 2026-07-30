import { fetchTopPolymarketMarkets } from "@/lib/polymarket";

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export async function PolymarketMarkets() {
  const markets = await fetchTopPolymarketMarkets(6);
  if (markets.length === 0) return null;

  return (
    <section>
      <div className="max-w-3xl">
        <span className="eyebrow">Live from Polymarket</span>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          The order books the strategy watches
        </h2>
        <p className="mt-3 leading-relaxed text-ink-300">
          Live prices, pulled straight from Polymarket&apos;s public API — the same prediction
          markets ArbiSmart&apos;s arbitrage engine scans for mispriced YES/NO pairs. This isn&apos;t a
          list of the protocol&apos;s open positions; it&apos;s the real market data behind the strategy.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <a
            key={m.slug || m.question}
            href={m.slug ? `https://polymarket.com/event/${m.slug}` : "https://polymarket.com"}
            target="_blank"
            rel="noreferrer noopener"
            className="card card-hover flex flex-col justify-between p-5"
          >
            <p className="line-clamp-3 text-sm font-medium leading-snug text-ink-50">{m.question}</p>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ink-400">Yes</p>
                <p className="font-display text-2xl font-bold tabular-nums text-brand-300">
                  {(m.yesPrice * 100).toFixed(1)}
                  <span className="ml-0.5 text-sm text-ink-400">%</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-ink-400">24h vol</p>
                <p className="text-sm font-medium tabular-nums text-ink-200">
                  {formatUsd(m.volume24hr)}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-5 text-xs text-ink-400">
        Source: Polymarket public Gamma API, refreshed every couple of minutes. Prices are implied
        probabilities from the live order book, not a recommendation.
      </p>
    </section>
  );
}

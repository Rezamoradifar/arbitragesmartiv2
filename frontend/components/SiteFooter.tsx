"use client";

import Link from "next/link";
import { BrandMark } from "@/components/NavBar";
import { useT } from "@/components/LocaleProvider";

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

/** Operating base, and the address users should write to. */
const BASED_IN = "Malaysia";
const CONTACT_EMAIL = "support@arbhub.site";

const columns: Array<{ titleKey: "platform" | "trust" | "community"; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    titleKey: "platform" as const,
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Get USDT on Polygon", href: "/get-usdt" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Activity", href: "/activity" },
      { label: "Gold rewards", href: "/rewards" },
      { label: "Dobrna (soon)", href: "/dobrna" },
      { label: "Governance", href: "/partners" },
    ],
  },
  {
    titleKey: "trust" as const,
    links: [
      { label: "Security model", href: "/security" },
      { label: "Bug bounty", href: "/security#bounty" },
      { label: "Verified source", href: `https://repo.sourcify.dev/137/${CONTRACT}`, external: true },
      { label: "PolygonScan", href: `https://polygonscan.com/address/${CONTRACT}`, external: true },
    ],
  },
  {
    titleKey: "community" as const,
    links: [
      { label: "Telegram", href: "https://t.me/arbhub_site", external: true },
      { label: "Contact us", href: "mailto:support@arbhub.site", external: true },
      { label: "Blockscout", href: `https://polygon.blockscout.com/address/${CONTRACT}?tab=contract`, external: true },
    ],
  },
];

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="layer mt-24 border-t border-white/[.06] bg-graphite-950/40">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={28} />
              <span className="font-display text-base font-bold tracking-[-.01em] text-white">
                ARBI<span className="text-gold-gradient">SMART</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-graphite-400">
              {t.footer.tagline}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-graphite-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
              {t.footer.operatingFrom}
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-2 inline-flex items-center gap-2 text-sm text-graphite-300 transition hover:text-gold-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.4" />
                <path d="m3 6 9 7 9-7" />
              </svg>
              {CONTACT_EMAIL}
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.titleKey}>
              <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-graphite-400">{t.footer[col.titleKey]}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-graphite-300 transition hover:text-gold-300"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-graphite-300 transition hover:text-gold-300">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider my-10" />

        {/* The risk note sits on every page rather than only on /security. A
            rate is a setting, not a promise, and that should never be more
            than a glance away. */}
        <p className="max-w-3xl text-xs leading-relaxed text-graphite-500">
          Staking returns are settings in the contract, not guarantees. Every deposit is charged a
          fee before the stake is recorded, and the deposit screen shows the exact split before you
          sign. The{" "}
          <Link href="/security" className="text-graphite-300 underline underline-offset-2 hover:text-gold-300">
            security page
          </Link>{" "}
          {" "}covers what the owner can and cannot do with pooled funds, and what we know is weak
          about this protocol.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-graphite-500">
            © {new Date().getFullYear()} ArbiSmart · {BASED_IN} · Polygon mainnet
          </p>
          <p className="font-mono text-[11px] text-graphite-600">{CONTRACT}</p>
        </div>
      </div>
    </footer>
  );
}

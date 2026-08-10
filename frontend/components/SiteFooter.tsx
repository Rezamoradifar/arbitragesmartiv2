import Link from "next/link";
import { BrandMark } from "@/components/NavBar";

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

const columns: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Activity", href: "/activity" },
      { label: "Governance", href: "/partners" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Security model", href: "/security" },
      { label: "Bug bounty", href: "/security#bounty" },
      { label: "Verified source", href: `https://repo.sourcify.dev/137/${CONTRACT}`, external: true },
      { label: "PolygonScan", href: `https://polygonscan.com/address/${CONTRACT}`, external: true },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Telegram", href: "https://t.me/arbhub_site", external: true },
      { label: "Blockscout", href: `https://polygon.blockscout.com/address/${CONTRACT}?tab=contract`, external: true },
    ],
  },
];

export function SiteFooter() {
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
              Advanced digital asset infrastructure on Polygon. Open-source, verified byte-for-byte,
              and built so that leaving never requires anyone&apos;s permission.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-graphite-400">{col.title}</h3>
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

        {/* The risk note is deliberately in the footer of every page rather
            than only on /security: a rate is a contract parameter, not a
            promise, and that should never be more than one glance away. */}
        <p className="max-w-3xl text-xs leading-relaxed text-graphite-500">
          Staking returns are contract parameters, not guarantees, and a deposit carries a platform
          fee that is charged before the stake is recorded — the deposit screen shows the exact split
          before you sign. Read the{" "}
          <Link href="/security" className="text-graphite-300 underline underline-offset-2 hover:text-gold-300">
            security page
          </Link>{" "}
          for what the owner can and cannot do with pooled funds, and for this protocol&apos;s known
          limitations.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-graphite-500">
            © {new Date().getFullYear()} ArbiSmart · Polygon mainnet
          </p>
          <p className="font-mono text-[11px] text-graphite-600">{CONTRACT}</p>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Web3Providers } from "@/lib/wagmi";
import { NavBar } from "@/components/NavBar";

// Sora for headlines and figures — it has the geometric confidence the old
// system-font build was missing. Inter for body copy, where legibility at
// small sizes matters more than character.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://arbhub.site";
const TITLE = "ArbiSmart — Polygon Staking & Referral Platform";
const DESCRIPTION =
  "Fixed daily staking rewards and a four-level referral programme on Polygon, with partner-governed emergency controls and a no-penalty exit stakers can trigger without permission.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "ArbiSmart",
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description:
      "Staking with an exit you don't have to trust anyone for. Every control that could touch your principal is bounded, delayed, or put to a vote.",
    url: SITE_URL,
    siteName: "ArbiSmart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Staking with an exit you don't have to trust anyone for, on Polygon.",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "Gw7b-maMBB243jbr8ksUV-HbbrQrKwu1IbSTawhughI",
    yandex: "964381b82b936e79",
    other: { "msvalidate.01": "7A25E60E667A559E0CEF61A0955934E2" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ArbiSmart",
  url: SITE_URL,
  description: DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        {/* eslint-disable-next-line react/no-danger */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Web3Providers>
          <NavBar />
          <main className="layer mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">{children}</main>
          <footer className="layer mt-10 border-t border-white/[.06] py-10 text-center text-sm text-ink-400">
            <p>
              ArbiSmart runs on an open-source smart contract on Polygon, published with an exact
              bytecode match.{" "}
              <a
                className="text-brand-400 underline decoration-brand-400/40 underline-offset-4 transition hover:text-brand-300"
                href={`https://polygon.blockscout.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}?tab=contract`}
                target="_blank"
                rel="noreferrer"
              >
                Read the verified source
              </a>{" "}
              ·{" "}
              <a
                className="text-brand-400 underline decoration-brand-400/40 underline-offset-4 transition hover:text-brand-300"
                href={`https://repo.sourcify.dev/137/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                Sourcify
              </a>{" "}
              ·{" "}
              <a
                className="text-brand-400 underline decoration-brand-400/40 underline-offset-4 transition hover:text-brand-300"
                href={`https://polygonscan.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                PolygonScan
              </a>
            </p>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-xs leading-relaxed text-ink-400/80">
              Staking returns are contract parameters, not a guarantee. Read the{" "}
              <a className="underline underline-offset-2" href="/security">
                security page
              </a>{" "}
              for what the owner can and cannot do with pooled funds, and for the known limitations
              of this protocol.
            </p>
          </footer>
        </Web3Providers>
      </body>
    </html>
  );
}

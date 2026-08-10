import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Web3Providers } from "@/lib/wagmi";
import { NavBar, MobileNav } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";

// Sora for headlines and figures — geometric, confident at large sizes. Inter
// for body copy, where legibility at 13-15px matters more than character.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://arbhub.site";
const TITLE = "ArbiSmart — Advanced Digital Asset Infrastructure";
const DESCRIPTION =
  "Institutional-grade staking infrastructure on Polygon. Fixed daily yield, a four-tier referral programme, and an exit no one can block — every control that could touch principal is bounded, delayed, or put to a partner vote.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · ArbiSmart" },
  description: DESCRIPTION,
  applicationName: "ArbiSmart",
  keywords: ["DeFi", "Polygon", "staking", "USDT", "yield", "smart contract", "Web3"],
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
    description: "Advanced digital asset infrastructure on Polygon.",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "Gw7b-maMBB243jbr8ksUV-HbbrQrKwu1IbSTawhughI",
    yandex: "964381b82b936e79",
    other: { "msvalidate.01": "7A25E60E667A559E0CEF61A0955934E2" },
  },
};

// Matches the page background, so the mobile browser chrome blends into the
// design instead of framing it in a lighter strip.
export const viewport: Viewport = {
  themeColor: "#05060b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Web3Providers>
          <NavBar />
          {/* Bottom padding clears the mobile tab bar; the lg breakpoint drops
              it again once that bar is gone. */}
          <main className="layer pb-28 lg:pb-0">{children}</main>
          <SiteFooter />
          <MobileNav />
        </Web3Providers>
      </body>
    </html>
  );
}

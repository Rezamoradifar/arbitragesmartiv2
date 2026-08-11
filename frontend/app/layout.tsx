import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Web3Providers } from "@/lib/wagmi";
import { NavBar, MobileNav } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { AppShell } from "@/components/AppShell";
import { themeScript } from "@/components/ThemeToggle";

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
  "Staking on Polygon with a fixed daily rate, a four-tier referral programme, and a withdrawal nobody can block. Every control that could reach your principal is capped, delayed, or put to a partner vote.";

/**
 * The card every chat app renders when someone pastes the link.
 *
 * 1200x630 is what Telegram, X and WhatsApp all crop toward, and a link with
 * no card is a link people scroll past. Without an explicit `images` entry
 * Next.js emits no og:image at all, so this is the difference between a
 * preview and a bare grey rectangle.
 */
const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "ArbiSmart — fixed-rate USDT staking on Polygon, with the contract published.",
};

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
      "Staking where getting out does not depend on trusting anyone. Every control that could reach your principal is capped, delayed, or put to a vote.",
    url: SITE_URL,
    siteName: "ArbiSmart",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Fixed-rate staking on Polygon, on a contract you can read.",
    images: [OG_IMAGE.url],
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
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets data-theme before the first paint. Without it the page renders
            dark, then repaints light for anyone who chose light — a flash that
            is worse than having no light theme at all. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* eslint-disable-next-line react/no-danger */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Web3Providers>
          <AppShell nav={<NavBar />} footer={<SiteFooter />} mobileNav={<MobileNav />}>
            {children}
          </AppShell>
        </Web3Providers>
      </body>
    </html>
  );
}

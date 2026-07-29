import type { Metadata } from "next";
import "./globals.css";
import { Web3Providers } from "@/lib/wagmi";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "ArbiSmart — Polygon Staking & Referral Platform",
  description:
    "Fixed daily staking rewards and a four-level referral programme on Polygon, with partner-governed emergency controls and a no-penalty exit stakers can trigger without permission.",
  openGraph: {
    title: "ArbiSmart — Polygon Staking & Referral Platform",
    description:
      "Staking with an exit you don't have to trust anyone for. Every control that could touch your principal is bounded, delayed, or put to a vote.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Providers>
          <NavBar />
          <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">{children}</main>
          <footer className="border-t border-slate-900 py-8 text-center text-sm text-slate-500">
            <p>
              ArbiSmart runs on a verified, open-source smart contract on Polygon.{" "}
              <a
                className="text-brand-400 underline underline-offset-2"
                href={`https://polygonscan.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
              >
                View contract on PolygonScan
              </a>
            </p>
            <p className="mx-auto mt-3 max-w-2xl px-4 text-xs text-slate-600">
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

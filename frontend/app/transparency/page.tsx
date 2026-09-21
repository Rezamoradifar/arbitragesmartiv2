import type { Metadata } from "next";
import Link from "next/link";
import { LiveStats } from "@/components/LiveStats";
export const metadata: Metadata = {
  title: "Reserve report | ArbiSmart",
  description: "Live on-chain reserves, principal and pool accounting.",
};
export default function TransparencyPage() {
  return (
    <div className="container-page market-home py-12 sm:py-16">
      <Link href="/" className="text-sm text-gold-300">
        ← Back to home
      </Link>
      <h1 className="h-section mt-6">Reserves & transparency</h1>
      <p className="mt-4 mb-10 max-w-2xl text-sm leading-relaxed text-graphite-300">
        Current reserves and recorded obligations, read from the Polygon
        contract. Values update every 15 seconds when the data source is
        available.
      </p>
      <LiveStats detailed />
      <p className="market-footnote">
        <Link href="/strategy">Strategy and funding model</Link> ·{" "}
        <Link href="/activity">Public transaction activity</Link>
      </p>
    </div>
  );
}

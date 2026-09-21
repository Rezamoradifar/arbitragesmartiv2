import type { Metadata } from "next";
import { PolymarketLive } from "@/components/PolymarketLive";
export const metadata: Metadata = {
  title: "Polymarket Live | ArbiSmart",
  description:
    "Live prediction markets, scanner estimates and verifiable protocol profit credits.",
};
export default function PolymarketPage() {
  return <PolymarketLive />;
}

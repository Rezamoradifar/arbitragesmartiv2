"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@/components/Icon";

type Scan = {
  scannedAt: string;
  marketsScanned: number;
  marketsFeeFree: number;
  minProfitThreshold: number;
  opportunitiesFound: number;
  topOpportunity: { profit: number } | null;
  sampleMarkets?: Array<{ question: string; feeFree: boolean }>;
};
function validScan(d: Scan): boolean {
  return (
    d &&
    Number.isFinite(Date.parse(d.scannedAt)) &&
    Date.parse(d.scannedAt) <= Date.now() + 5_000 &&
    [d.marketsScanned, d.marketsFeeFree, d.opportunitiesFound].every(
      (n) => Number.isInteger(n) && n >= 0,
    ) &&
    Number.isFinite(d.minProfitThreshold) &&
    d.minProfitThreshold >= 0
  );
}
export function ArbitrageScanner() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const q = useQuery<Scan>({
    queryKey: ["arbitrage-scan"],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/arbitrage-status.json?t=${Date.now()}`, {
        cache: "no-store",
        signal,
      });
      if (!r.ok) throw new Error("No scanner report published");
      const d = await r.json();
      if (!validScan(d)) throw new Error("Invalid scanner report");
      return d;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const d = q.data;
  const age = d ? Math.max(0, now - Date.parse(d.scannedAt)) : null;
  const fresh = age !== null && age <= 30 * 60_000;
  return (
    <section className="scanner-strip glass">
      <div className="scanner-intro">
        <span className="eyebrow !border-0 !bg-transparent !p-0">
          <Icon name="activity" className="h-4 w-4" /> PREDICTION MARKET SCANNER
        </span>
        <h3>Watching for a complete-set edge.</h3>
        <p>
          The latest published order-book scan. Observed opportunities are
          separate from executed trades.
        </p>
        <Link href="/strategy" className="scanner-link">
          Explore the strategy{" "}
          <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-45" />
        </Link>
      </div>
      <div className="scanner-metrics">
        <div>
          <span>Markets scanned</span>
          <strong>{d ? d.marketsScanned.toLocaleString("en-US") : "—"}</strong>
        </div>
        <div>
          <span>{fresh ? "Above threshold" : "Last reported matches"}</span>
          <strong>{d ? d.opportunitiesFound : "—"}</strong>
        </div>
        <div>
          <span>Profit threshold</span>
          <strong>{d ? `$${d.minProfitThreshold.toFixed(2)}` : "—"}</strong>
        </div>
      </div>
      <div className="scanner-foot">
        <span className={`status-dot ${fresh ? "online" : ""}`} />
        <span>
          {d
            ? `${fresh ? "Latest scan" : "Scan is stale"} · ${Math.floor((age ?? 0) / 60_000)}m ago`
            : q.isLoading
              ? "Checking scanner report"
              : "No scanner report available"}
        </span>
        <span>Read-only monitor</span>
      </div>
    </section>
  );
}

export type ArbitrageScan = {
  scannedAt: string;
  marketsScanned: number;
  marketsFeeFree: number;
  minProfitThreshold: number;
  opportunitiesFound: number;
  topOpportunity: { profit: number } | null;
  onchainCostAssumed?: number;
};

/** Reject malformed reports before displaying financial observations. */
export function parseArbitrageScan(
  value: unknown,
  now = Date.now(),
): ArbitrageScan {
  if (!value || typeof value !== "object")
    throw new Error("Invalid scanner report");
  const d = value as ArbitrageScan;
  const timestamp =
    typeof d.scannedAt === "string" ? Date.parse(d.scannedAt) : NaN;
  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0 ||
    timestamp > now + 5_000 ||
    ![d.marketsScanned, d.marketsFeeFree, d.opportunitiesFound].every(
      (n) => Number.isInteger(n) && n >= 0,
    ) ||
    d.marketsFeeFree > d.marketsScanned ||
    d.opportunitiesFound > d.marketsScanned ||
    !Number.isFinite(d.minProfitThreshold) ||
    d.minProfitThreshold < 0 ||
    (d.onchainCostAssumed !== undefined &&
      (!Number.isFinite(d.onchainCostAssumed) || d.onchainCostAssumed < 0)) ||
    (d.opportunitiesFound === 0 && d.topOpportunity !== null) ||
    (d.opportunitiesFound > 0 &&
      (!d.topOpportunity ||
        !Number.isFinite(d.topOpportunity.profit) ||
        d.topOpportunity.profit < d.minProfitThreshold))
  ) {
    throw new Error("Invalid scanner report");
  }
  return d;
}

export function isFreshScan(
  d: ArbitrageScan | undefined,
  now: number,
): boolean {
  if (!d || !now) return false;
  const age = now - Date.parse(d.scannedAt);
  return age >= -5_000 && age <= 30 * 60_000;
}

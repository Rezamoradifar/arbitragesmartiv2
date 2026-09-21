export type TradingBotReport = {
  updatedAt: string;
  lastRunAt: string;
  mode: "dry-run" | "live";
  walletAddress: string;
  lastDecision: "no-opportunity" | "found" | "executed" | "skipped-stale";
  tradesExecuted: number;
  realizedProfitUsd: number;
};

/** Operator telemetry is never proof of a fill or profit. */
export function parseTradingBotReport(value: unknown, now = Date.now()): TradingBotReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  for (const key of ["updatedAt", "lastRunAt"] as const) {
    if (typeof v[key] !== "string") return null;
    const timestamp = Date.parse(v[key] as string);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now + 60_000) return null;
  }
  if (Date.parse(v.lastRunAt as string) > Date.parse(v.updatedAt as string) + 60_000) return null;
  if (v.mode !== "dry-run" && v.mode !== "live") return null;
  if (typeof v.walletAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(v.walletAddress)) return null;
  if (!["no-opportunity", "found", "executed", "skipped-stale"].includes(String(v.lastDecision))) return null;
  if (typeof v.tradesExecuted !== "number" || !Number.isSafeInteger(v.tradesExecuted) || v.tradesExecuted < 0) return null;
  if (typeof v.realizedProfitUsd !== "number" || !Number.isFinite(v.realizedProfitUsd)) return null;
  return {
    updatedAt: v.updatedAt as string, lastRunAt: v.lastRunAt as string,
    mode: v.mode, walletAddress: v.walletAddress,
    lastDecision: v.lastDecision as TradingBotReport["lastDecision"],
    tradesExecuted: v.tradesExecuted, realizedProfitUsd: v.realizedProfitUsd,
  };
}

export function isFreshTradingBotReport(report: TradingBotReport | undefined, now: number): boolean {
  if (!report || now <= 0) return false;
  return [report.updatedAt, report.lastRunAt].every((iso) => {
    const age = now - Date.parse(iso);
    return age >= -60_000 && age <= 30 * 60_000;
  });
}

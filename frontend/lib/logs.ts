import type { PublicClient } from "viem";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contract";

/** Roughly three days of Polygon blocks at ~2s each. */
export const LOOKBACK_BLOCKS = 120_000n;
/** Fallback window when the endpoint refuses deep history — about 20 minutes. */
export const SHALLOW_LOOKBACK = 600n;
/** Chunk width for that fallback; 1rpc caps eth_getLogs at 50 blocks. */
export const CHUNK_BLOCKS = 45n;
export const CHUNK_CONCURRENCY = 4;

export type FetchedLogs = {
  logs: unknown[];
  /** True when only the short recent window could be read. */
  reduced: boolean;
};

/** Looks up an event's ABI entry by name so callers can filter server-side. */
export function eventAbi(name: string) {
  return (CONTRACT_ABI as Array<{ type: string; name?: string }>).find(
    (x) => x.type === "event" && x.name === name,
  );
}

/**
 * Reads contract logs over the widest window the endpoint will serve.
 *
 * Free Polygon endpoints differ in what they allow, and the binding constraint
 * is archive DEPTH rather than range width: several answer a query over recent
 * blocks but refuse the same width once it reaches back a few days. So this
 * asks for the full window first, and only on refusal walks a short recent
 * window in small chunks. Callers are told which they got via `reduced`, so
 * the UI can say so instead of presenting a truncated history as complete.
 */
export async function fetchLogsWithFallback(
  client: PublicClient,
  params: { event?: unknown; args?: Record<string, unknown> } = {},
): Promise<FetchedLogs> {
  const latest = await client.getBlockNumber();
  const fullFrom = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

  const base = {
    address: CONTRACT_ADDRESS,
    ...(params.event ? { event: params.event } : {}),
    ...(params.args ? { args: params.args } : {}),
  } as never;

  try {
    const logs = await client.getLogs({ ...(base as object), fromBlock: fullFrom, toBlock: latest } as never);
    return { logs: logs as unknown[], reduced: false };
  } catch {
    const shallowFrom = latest > SHALLOW_LOOKBACK ? latest - SHALLOW_LOOKBACK : 0n;

    const ranges: Array<{ from: bigint; to: bigint }> = [];
    for (let start = shallowFrom; start <= latest; start += CHUNK_BLOCKS + 1n) {
      const end = start + CHUNK_BLOCKS > latest ? latest : start + CHUNK_BLOCKS;
      ranges.push({ from: start, to: end });
    }

    const logs: unknown[] = [];
    let failed = 0;

    for (let i = 0; i < ranges.length; i += CHUNK_CONCURRENCY) {
      const batch = ranges.slice(i, i + CHUNK_CONCURRENCY);
      const results = await Promise.all(
        batch.map((r) =>
          client
            .getLogs({ ...(base as object), fromBlock: r.from, toBlock: r.to } as never)
            .catch(() => {
              failed++;
              return [] as unknown[];
            }),
        ),
      );
      for (const chunk of results) logs.push(...(chunk as unknown[]));
    }

    if (failed === ranges.length) {
      throw new Error("This RPC endpoint refused every log query.");
    }
    return { logs, reduced: true };
  }
}

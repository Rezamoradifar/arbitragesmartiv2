import { http, fallback } from "viem";

/**
 * Free public Polygon endpoints, verified reachable and returning chain id 137.
 * Tenderly leads because it is the only one of these that serves wide
 * `eth_getLogs` ranges; the rest cap at ~10k blocks, which the Activity page
 * works around by chunking. Deliberately excluded after testing: polygon-rpc.com
 * (401, tenant disabled), rpc.ankr.com and llamarpc (both now require an API
 * key), blastapi (discontinued its free tier), blockpi/meowrpc/omniatech
 * (unreachable, 521).
 *
 * Shared by every contract read in the app — the wallet-connected client in
 * wagmi.tsx and every server-side createPublicClient (the health check, the
 * assistant) — so a single provider's outage or rate limit degrades one
 * endpoint in the pool instead of taking down whichever code path happened
 * to hardcode it.
 */
export const PUBLIC_POLYGON_RPCS = [
  "https://polygon.gateway.tenderly.co",
  "https://polygon.drpc.org",
  "https://1rpc.io/matic",
  "https://polygon-bor-rpc.publicnode.com",
];

const customRpc = process.env.NEXT_PUBLIC_POLYGON_RPC_URL?.trim();

/**
 * A private endpoint, when configured, is tried first and the public ones stay
 * behind it as automatic failover — so a provider outage or a rate-limit spike
 * degrades instead of taking the whole site down.
 */
export const rpcEndpoints = customRpc ? [customRpc, ...PUBLIC_POLYGON_RPCS] : PUBLIC_POLYGON_RPCS;

export const polygonTransport = fallback(
  rpcEndpoints.map((url) => http(url, { batch: true, timeout: 15_000, retryCount: 2 })),
  { rank: { interval: 60_000, sampleCount: 5 } },
);

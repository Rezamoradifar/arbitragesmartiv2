import { createPublicClient, http, type Abi } from "viem";
import { polygon } from "viem/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

/**
 * Something a monitor can poll.
 *
 * The site is only as up as its RPC: the process can be serving pages
 * perfectly while every number on them fails to load. So this checks the
 * chain read too, and reports degraded rather than ok when that is what is
 * happening — a health check that only proves the process is alive tells you
 * the one thing you already knew.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createPublicClient({
  chain: polygon,
  transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.gateway.tenderly.co"),
});

export async function GET() {
  const startedAt = Date.now();

  let chain: { ok: boolean; block?: string; paused?: boolean; error?: string };
  try {
    const [block, paused] = await Promise.all([
      client.getBlockNumber(),
      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI as Abi,
        functionName: "paused",
      }) as Promise<boolean>,
    ]);
    chain = { ok: true, block: block.toString(), paused };
  } catch (e) {
    chain = { ok: false, error: e instanceof Error ? e.message.slice(0, 140) : "unknown" };
  }

  const body = {
    status: chain.ok ? "ok" : "degraded",
    uptimeSeconds: Math.round(process.uptime()),
    latencyMs: Date.now() - startedAt,
    contract: CONTRACT_ADDRESS,
    chain,
    assistant: Boolean(process.env.ANTHROPIC_API_KEY) ? "configured" : "disabled",
    time: new Date().toISOString(),
  };

  // 503 on degraded so an uptime monitor sees it without parsing the body.
  return Response.json(body, {
    status: chain.ok ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}

/**
 * KuCoin's public WebSocket feed requires a short-lived connection token,
 * minted via a POST to bullet-public — server-side because that endpoint
 * does not reliably send CORS headers back to a browser caller. This route
 * fetches it and hands the client only what it needs to connect: the
 * endpoint URL, the token, and the ping interval KuCoin expects.
 *
 * No credential involved — bullet-public is unauthenticated and public.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await fetch("https://api.kucoin.com/api/v1/bullet-public", { method: "POST" });
    if (!res.ok) throw new Error(`bullet-public responded ${res.status}`);
    const body = await res.json();
    const server = body?.data?.instanceServers?.[0];
    const token = body?.data?.token;
    if (!server?.endpoint || !token) throw new Error("unexpected bullet-public shape");

    return Response.json(
      { endpoint: server.endpoint, token, pingInterval: server.pingInterval ?? 18_000 },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

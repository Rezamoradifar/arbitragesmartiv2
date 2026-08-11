import { NextRequest } from "next/server";
import { buildFacts, SYSTEM_RULES } from "@/lib/assistant/facts";

/**
 * The site's assistant.
 *
 * Server-side because the API key must never reach a browser, and because the
 * facts the model is allowed to use are assembled here from the contract
 * rather than trusted from the client. A request body cannot change what the
 * assistant believes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT = 1_200;
const MAX_TURNS = 12;

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Which model service to talk to, if any.
 *
 * Two shapes are supported because the site does not need to pay for this.
 * Anthropic if an Anthropic key is set; otherwise any OpenAI-compatible
 * endpoint, which covers the providers with a genuinely free tier — Google AI
 * Studio, Groq, OpenRouter's free models. Set ASSISTANT_API_KEY and, if it is
 * not Google, ASSISTANT_BASE_URL and ASSISTANT_MODEL.
 *
 * With neither key set this route reports unavailable and the browser answers
 * from lib/assistant/guide instead, which is the default and costs nothing.
 */
function provider() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      kind: "anthropic" as const,
      key: anthropicKey,
      url: "https://api.anthropic.com/v1/messages",
      model: process.env.ASSISTANT_MODEL || "claude-haiku-4-5-20251001",
    };
  }

  const key = process.env.ASSISTANT_API_KEY;
  if (key) {
    const base = (
      process.env.ASSISTANT_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai"
    ).replace(/\/+$/, "");
    return {
      kind: "openai" as const,
      key,
      url: `${base}/chat/completions`,
      model: process.env.ASSISTANT_MODEL || "gemini-flash-lite-latest",
    };
  }

  return null;
}

function requestFor(
  p: NonNullable<ReturnType<typeof provider>>,
  system: string,
  messages: Msg[],
): { headers: Record<string, string>; body: Record<string, unknown> } {
  if (p.kind === "anthropic") {
    return {
      headers: {
        "content-type": "application/json",
        "x-api-key": p.key,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: p.model,
        max_tokens: 600,
        temperature: 0.2,
        system,
        messages,
        stream: true,
      },
    };
  }

  // OpenAI-compatible services carry the system prompt as the first turn
  // rather than as its own field.
  return {
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
    body: {
      model: p.model,
      // Far more than the answer needs. Gemini spends tokens reasoning before
      // it writes, and that spend counts against this budget — at 600 the
      // reasoning consumed the lot and a fragment of it came back as the
      // answer. The reply is still two or three sentences; the headroom just
      // keeps it from being cut off mid-thought.
      max_tokens: 2_000,
      temperature: 0.2,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    },
  };
}

/** Pull the text out of one SSE frame, whichever provider sent it. */
function textFrom(kind: "anthropic" | "openai", evt: any): string {
  if (kind === "anthropic") {
    return evt?.type === "content_block_delta" && evt?.delta?.type === "text_delta"
      ? (evt.delta.text as string)
      : "";
  }
  return typeof evt?.choices?.[0]?.delta?.content === "string" ? evt.choices[0].delta.content : "";
}

/** Requests per window, per address. */
const LIMIT = 12;
const WINDOW = 30 * 60_000;

/**
 * In-memory, which is the right size for this: one PM2 process serves the
 * site, and the cost of an occasional reset after a deploy is far below the
 * cost of adding a database to hold counters.
 */
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const seen = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  seen.push(now);
  hits.set(ip, seen);

  // Stop the map growing without bound on a long-running process.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (v.every((t) => now - t > WINDOW)) hits.delete(k);
  }
  return seen.length > LIMIT;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "unknown").trim();
}

/** The widget asks on mount. Unavailable is not a failure — it means the
 *  browser answers from the built-in guide instead. */
export async function GET() {
  return Response.json({ available: Boolean(provider()) });
}

export async function POST(req: NextRequest) {
  const p = provider();
  if (!p) {
    return Response.json({ error: "The assistant is not configured." }, { status: 503 });
  }

  if (rateLimited(clientIp(req))) {
    return Response.json(
      { error: "Too many questions in a short time. Try again in a little while." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return Response.json({ error: "No question." }, { status: 400 });
  }

  // Rebuild the conversation from scratch rather than trusting its shape. A
  // client cannot smuggle in an extra system turn this way.
  const messages = raw
    .slice(-MAX_TURNS)
    .map((m) => {
      const role = (m as { role?: unknown }).role;
      const content = (m as { content?: unknown }).content;
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
      const text = content.trim().slice(0, MAX_INPUT);
      return text ? { role, content: text } : null;
    })
    .filter((m): m is Msg => m !== null);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No question." }, { status: 400 });
  }

  const system = `${SYSTEM_RULES}\n\nFACTS\n\n${await buildFacts()}`;
  const { headers, body: payload } = requestFor(p, system, messages);

  let upstream: Response;
  try {
    upstream = await fetch(p.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json({ error: "The assistant is unreachable right now." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "The assistant could not answer." }, { status: 502 });
  }

  // Re-emit only the text deltas. The browser never sees the upstream
  // envelope, so nothing about the provider or the prompt leaks through.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data:")) continue;
        const frame = line.slice(5).trim();
        if (!frame || frame === "[DONE]") continue;
        try {
          const text = textFrom(p.kind, JSON.parse(frame));
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          /* keep-alives and partial frames are expected */
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

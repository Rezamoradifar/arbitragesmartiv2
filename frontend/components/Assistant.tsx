"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I start?",
  "What does it cost to deposit?",
  "What if I want to leave early?",
  "How do referrals pay?",
];

/**
 * A helper for the one question a newcomer actually has, which is usually
 * "where do I even begin". It answers only about this protocol, from figures
 * the server reads off the contract — see lib/assistant/facts.
 *
 * It asks the server whether it is configured before rendering anything. A
 * launcher that opens onto an error is worse than no launcher, and the API
 * key living only on the server means the client genuinely cannot know
 * without asking.
 */
export function Assistant() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => alive && setAvailable(Boolean(d?.available)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }

      // Append an empty turn and fill it as the stream arrives, so the answer
      // appears word by word rather than after a long silence.
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }
    } catch {
      setError("Could not reach the assistant.");
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <>
      {/* Sits above the mobile tab bar rather than on top of it. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close the assistant" : "Ask about ArbiSmart"}
        className="fixed bottom-28 right-4 z-50 grid h-12 w-12 place-items-center rounded-2xl bg-gold-sheen text-onGold shadow-gold-lg transition hover:scale-105 xl:bottom-6 xl:right-6"
      >
        <Icon name={open ? "minus" : "info"} className="h-5 w-5" strokeWidth={2.2} />
      </button>

      {open && (
        <div className="glass fixed bottom-44 right-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden p-0 xl:bottom-24 xl:right-6">
          <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-white">Ask about ArbiSmart</p>
              <p className="text-[11px] text-graphite-500">
                Answers about this protocol only, from the contract
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-graphite-400 transition hover:text-white"
            >
              <Icon name="minus" className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <>
                <p className="text-xs leading-relaxed text-graphite-400">
                  It will not predict returns, tell you how much to deposit, or answer anything that
                  is not about this protocol. Every figure it gives comes from the contract.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-white/[.08] bg-white/[.02] px-3 py-1.5 text-left text-[11px] text-graphite-300 transition hover:border-gold-400/25 hover:text-gold-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-gold-400/12 text-graphite-100"
                    : "bg-white/[.04] text-graphite-200"
                }`}
              >
                {m.content || "…"}
              </div>
            ))}

            {error && <p className="text-[11px] leading-relaxed text-danger-400">{error}</p>}
            <div ref={bottom} />
          </div>

          <form
            className="flex gap-2 border-t border-white/[.07] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              maxLength={1200}
              className="input flex-1 text-[13px]"
              aria-label="Your question"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-primary shrink-0 px-4 py-2 text-xs disabled:opacity-40"
            >
              {busy ? "…" : "Ask"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

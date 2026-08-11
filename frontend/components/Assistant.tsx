"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { TOPICS, findTopic, NO_MATCH } from "@/lib/assistant/guide";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * A helper for the one question a newcomer actually has, which is usually
 * "where do I even begin".
 *
 * It runs in guide mode by default: the answers live in lib/assistant/guide,
 * they are written out rather than generated, and every figure in one comes
 * from the same constants the interface renders. That costs nothing, works
 * with no key and no network, and cannot invent a rate — which on a page where
 * people are deciding what to do with money matters more than sounding fluent.
 *
 * If the server reports a model configured, the same panel streams from it
 * instead and the topic list becomes a set of prompts. The mode is the
 * server's to decide; the browser only asks.
 */
export function Assistant() {
  const [llm, setLlm] = useState(false);
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
      .then((d) => alive && setLlm(Boolean(d?.available)))
      .catch(() => {
        /* guide mode is the fallback, and it is already the default */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function answerLocally(question: string, history: Msg[]) {
    const topic = findTopic(question);
    setMessages([...history, { role: "assistant", content: topic ? topic.answer : NO_MATCH }]);
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setError(null);

    if (!llm) {
      answerLocally(question, next);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        // Falling back to the written answer beats showing an error: the user
        // asked a question, and one of these two can always answer it.
        answerLocally(question, next);
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
      answerLocally(question, next);
    } finally {
      setBusy(false);
    }
  }

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
              <p className="text-xs leading-relaxed text-graphite-400">
                It will not predict returns, tell you how much to deposit, or answer anything that is
                not about this protocol. Every figure it gives comes from the contract. Pick a topic
                below or type a question.
              </p>
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

          {/* Above the input rather than in the transcript. In the transcript
              the list grows under every answer and pushes it out of view, so
              the reply to the question just asked is the thing you cannot
              see. One line, scrolled sideways, stays out of the way. */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-white/[.07] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => send(t.question)}
                className="shrink-0 whitespace-nowrap rounded-full border border-white/[.08] bg-white/[.02] px-3 py-1.5 text-[11px] text-graphite-300 transition hover:border-gold-400/25 hover:text-gold-300"
              >
                {t.question}
              </button>
            ))}
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

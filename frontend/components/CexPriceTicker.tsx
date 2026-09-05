"use client";

import { useEffect, useRef, useState } from "react";
import { LiveDot } from "@/components/Aurora";
import { Badge } from "@/components/ui";

/**
 * Live BTC/USDT best bid/ask from Binance and KuCoin's own public market
 * data streams — nothing routed through a server we run, nothing the
 * contract touches. Binance's stream is public and connects straight from
 * the browser; KuCoin needs a short-lived token first, minted server-side by
 * /api/kucoin-token because that endpoint doesn't hand out CORS headers.
 *
 * This is a price reference, not a feed of trades ArbiSmart takes — the
 * contract has no connection to either exchange. Said plainly in the copy
 * below so it can't be mistaken for the protocol's own activity.
 */

type Quote = { bid: number; ask: number; updatedAt: number };

const RECONNECT_MS = 4_000;

function fmt(n: number | undefined): string {
  return n === undefined ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Percent gain from buying at `ask` on one venue and selling at `bid` on the other. */
function spreadPct(buyAsk: number, sellBid: number): number {
  return ((sellBid - buyAsk) / buyAsk) * 100;
}

export function CexPriceTicker() {
  const [binance, setBinance] = useState<Quote | null>(null);
  const [kucoin, setKucoin] = useState<Quote | null>(null);
  const [binanceLive, setBinanceLive] = useState(false);
  const [kucoinLive, setKucoinLive] = useState(false);

  const binanceSocket = useRef<WebSocket | null>(null);
  const kucoinSocket = useRef<WebSocket | null>(null);
  const kucoinPing = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connectBinance() {
      const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@bookTicker");
      binanceSocket.current = ws;

      ws.onopen = () => !cancelled && setBinanceLive(true);
      ws.onmessage = (event) => {
        if (cancelled) return;
        const msg = JSON.parse(event.data);
        const bid = Number(msg.b);
        const ask = Number(msg.a);
        if (Number.isFinite(bid) && Number.isFinite(ask)) {
          setBinance({ bid, ask, updatedAt: Date.now() });
        }
      };
      ws.onclose = () => {
        if (cancelled) return;
        setBinanceLive(false);
        reconnectTimer = setTimeout(connectBinance, RECONNECT_MS);
      };
      ws.onerror = () => ws.close();
    }

    connectBinance();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      binanceSocket.current?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    async function connectKucoin() {
      try {
        const res = await fetch("/api/kucoin-token", { method: "POST", cache: "no-store" });
        if (!res.ok) throw new Error("no token");
        const { endpoint, token, pingInterval } = await res.json();
        if (cancelled) return;

        const connectId = Math.random().toString(36).slice(2);
        const ws = new WebSocket(`${endpoint}?token=${token}&connectId=${connectId}`);
        kucoinSocket.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setKucoinLive(true);
          ws.send(
            JSON.stringify({
              id: Date.now(),
              type: "subscribe",
              topic: "/market/ticker:BTC-USDT",
              privateChannel: false,
              response: true,
            }),
          );
          kucoinPing.current = setInterval(() => {
            ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ id: Date.now(), type: "ping" }));
          }, Math.max(pingInterval - 2_000, 5_000));
        };
        ws.onmessage = (event) => {
          if (cancelled) return;
          const msg = JSON.parse(event.data);
          if (msg.type !== "message" || msg.topic !== "/market/ticker:BTC-USDT") return;
          const bid = Number(msg.data?.bestBid);
          const ask = Number(msg.data?.bestAsk);
          if (Number.isFinite(bid) && Number.isFinite(ask)) {
            setKucoin({ bid, ask, updatedAt: Date.now() });
          }
        };
        ws.onclose = () => {
          if (cancelled) return;
          setKucoinLive(false);
          if (kucoinPing.current) clearInterval(kucoinPing.current);
          reconnectTimer = setTimeout(connectKucoin, RECONNECT_MS);
        };
        ws.onerror = () => ws.close();
      } catch {
        if (!cancelled) reconnectTimer = setTimeout(connectKucoin, RECONNECT_MS);
      }
    }

    connectKucoin();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      if (kucoinPing.current) clearInterval(kucoinPing.current);
      kucoinSocket.current?.close();
    };
  }, []);

  const bothLive = binance && kucoin;
  const buyBinanceSellKucoin = bothLive ? spreadPct(binance.ask, kucoin.bid) : null;
  const buyKucoinSellBinance = bothLive ? spreadPct(kucoin.ask, binance.bid) : null;
  const best = bothLive ? Math.max(buyBinanceSellKucoin!, buyKucoinSellBinance!) : null;

  return (
    <div className="glass p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LiveDot />
          <p className="eyebrow !border-0 !bg-transparent !p-0">BTC/USDT — Binance vs KuCoin</p>
        </div>
        {best !== null && (
          <Badge tone={best > 0.05 ? "good" : "neutral"}>{best >= 0 ? "+" : ""}{best.toFixed(3)}%</Badge>
        )}
      </div>

      <p className="mt-3 max-w-xl text-xs leading-relaxed text-graphite-400">
        Live public order-book prices, for reference only. ArbiSmart&apos;s contract has no
        connection to Binance or KuCoin — this isn&apos;t a position the protocol holds or a trade
        it takes, just what the two order books show right now, gross of either exchange&apos;s
        trading fees.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[.08] text-left text-xs uppercase tracking-wide text-graphite-500">
              <th className="pb-2 font-medium">Exchange</th>
              <th className="pb-2 text-right font-medium">Bid</th>
              <th className="pb-2 text-right font-medium">Ask</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b border-white/[.06]">
              <td className="py-3 font-medium text-graphite-200">Binance</td>
              <td className="py-3 text-right text-graphite-100">{fmt(binance?.bid)}</td>
              <td className="py-3 text-right text-graphite-100">{fmt(binance?.ask)}</td>
              <td className="py-3 text-right">
                <Badge tone={binanceLive ? "good" : "neutral"}>{binanceLive ? "Live" : "Connecting…"}</Badge>
              </td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-graphite-200">KuCoin</td>
              <td className="py-3 text-right text-graphite-100">{fmt(kucoin?.bid)}</td>
              <td className="py-3 text-right text-graphite-100">{fmt(kucoin?.ask)}</td>
              <td className="py-3 text-right">
                <Badge tone={kucoinLive ? "good" : "neutral"}>{kucoinLive ? "Live" : "Connecting…"}</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {bothLive && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-graphite-500">Buy Binance → sell KuCoin</p>
            <p
              className={`mt-1 font-display text-lg font-bold tabular-nums ${buyBinanceSellKucoin! > 0 ? "text-volt-300" : "text-graphite-400"}`}
            >
              {buyBinanceSellKucoin! >= 0 ? "+" : ""}
              {buyBinanceSellKucoin!.toFixed(3)}%
            </p>
          </div>
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-graphite-500">Buy KuCoin → sell Binance</p>
            <p
              className={`mt-1 font-display text-lg font-bold tabular-nums ${buyKucoinSellBinance! > 0 ? "text-volt-300" : "text-graphite-400"}`}
            >
              {buyKucoinSellBinance! >= 0 ? "+" : ""}
              {buyKucoinSellBinance!.toFixed(3)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

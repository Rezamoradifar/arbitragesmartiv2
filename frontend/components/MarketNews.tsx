"use client";

import { useEffect, useState } from "react";
import { LiveDot } from "@/components/Aurora";
import { Skeleton, EmptyState } from "@/components/ui";

type MarketNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * Real, external crypto/DeFi headlines — not written by the site, only
 * linked to. Returns null while loading or on an empty feed rather than a
 * placeholder, matching every other live panel on the page.
 */
export function MarketNews() {
  const [items, setItems] = useState<MarketNewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market-news", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="glass p-6 sm:p-8">
      <div className="flex items-center gap-2.5">
        <LiveDot />
        <p className="eyebrow !border-0 !bg-transparent !p-0">Market news</p>
      </div>

      <div className="mt-6 space-y-5">
        {items === null &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}

        {items !== null && items.length === 0 && <EmptyState title="No headlines available" />}

        {items !== null &&
          items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b border-white/[.06] pb-5 transition-colors last:border-0 last:pb-0 hover:text-gold-300"
            >
              <p className="text-xs text-graphite-500">
                {item.source} · {timeAgo(item.publishedAt)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">{item.title}</p>
            </a>
          ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { LiveDot } from "@/components/Aurora";
import { Skeleton, EmptyState } from "@/components/ui";

type NewsItem = {
  id: string;
  postedAt: string;
  text: string;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Real, dated platform updates — the same facts already published to the
 * public Telegram channel, not separately-written site copy. Returns null
 * while loading or if the feed is empty, rather than a placeholder, so the
 * panel never implies content that isn't there.
 */
export function NewsFeed() {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news", { cache: "no-store" })
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
        <p className="eyebrow !border-0 !bg-transparent !p-0">Platform updates</p>
      </div>

      <div className="mt-6 space-y-5">
        {items === null &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}

        {items !== null && items.length === 0 && (
          <EmptyState title="No updates published yet" />
        )}

        {items !== null &&
          items.map((item) => (
            <div key={item.id} className="border-b border-white/[.06] pb-5 last:border-0 last:pb-0">
              <p className="text-xs text-graphite-500">{timeAgo(item.postedAt)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">{item.text}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

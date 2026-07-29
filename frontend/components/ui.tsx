"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EXPLORER, formatDuration, secondsUntil } from "@/lib/contract";

export function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-300">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/[.05] text-ink-200",
  good: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  bad: "border-red-400/25 bg-red-500/10 text-red-300",
  brand: "border-brand-400/25 bg-brand-500/10 text-brand-300",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[.06] py-2.5 last:border-0">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-ink-50">{value}</span>
    </div>
  );
}

export function Progress({ value, max, tone = "brand" }: { value: number; max: number; tone?: Tone }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const bar: Record<Tone, string> = {
    neutral: "bg-gradient-to-r from-ink-400 to-ink-300",
    good: "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_18px_-2px_rgba(16,185,129,.7)]",
    warn: "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_18px_-2px_rgba(245,158,11,.7)]",
    bad: "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_18px_-2px_rgba(239,68,68,.7)]",
    brand: "bg-gradient-to-r from-brand-600 to-brand-300 shadow-[0_0_18px_-2px_rgba(62,200,159,.7)]",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full border border-white/[.06] bg-ink-950" role="progressbar" aria-valuenow={Math.round(pct)}>
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${bar[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Live countdown to a unix timestamp. Ticks locally rather than re-reading
 * the chain every second; the parent refetches on the transactions that
 * actually move the deadline.
 */
export function Countdown({
  target,
  prefix,
  done,
}: {
  target: bigint | number | undefined;
  prefix?: string;
  done?: ReactNode;
}) {
  const [left, setLeft] = useState(() => secondsUntil(target));

  useEffect(() => {
    setLeft(secondsUntil(target));
    const id = setInterval(() => setLeft(secondsUntil(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || Number(target) === 0) return <span className="text-ink-400">—</span>;
  if (left <= 0) return <>{done ?? <span className="text-brand-400">Ready</span>}</>;
  return (
    <span className="tabular-nums">
      {prefix} {formatDuration(left)}
    </span>
  );
}

export function AddressLink({ address, label }: { address?: string; label?: string }) {
  if (!address) return <span className="text-ink-400">—</span>;
  return (
    <a
      className="font-mono text-sm text-brand-400 underline underline-offset-2 hover:text-brand-300"
      href={`${EXPLORER}/address/${address}`}
      target="_blank"
      rel="noreferrer"
    >
      {label ?? `${address.slice(0, 6)}…${address.slice(-4)}`}
    </a>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[.07] px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-400">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = "h-6 w-24" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-shimmer rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,.04)_25%,rgba(255,255,255,.11)_37%,rgba(255,255,255,.04)_63%)] bg-[length:200%_100%] ${className}`}
    />
  );
}

export function Alert({ tone = "warn", title, children }: { tone?: Tone; title: string; children?: ReactNode }) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 backdrop-blur ${toneClasses[tone]}`}>
      <p className="font-display text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
    </div>
  );
}

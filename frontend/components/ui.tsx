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
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-700 bg-slate-800/60 text-slate-300",
  good: "border-emerald-800 bg-emerald-950/60 text-emerald-300",
  warn: "border-amber-800 bg-amber-950/60 text-amber-300",
  bad: "border-red-900 bg-red-950/60 text-red-300",
  brand: "border-brand-800 bg-brand-950/60 text-brand-300",
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
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-800/70 py-2.5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-100">{value}</span>
    </div>
  );
}

export function Progress({ value, max, tone = "brand" }: { value: number; max: number; tone?: Tone }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const bar: Record<Tone, string> = {
    neutral: "bg-slate-500",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
    brand: "bg-brand-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(pct)}>
      <div className={`h-full rounded-full transition-all ${bar[tone]}`} style={{ width: `${pct}%` }} />
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

  if (!target || Number(target) === 0) return <span className="text-slate-500">—</span>;
  if (left <= 0) return <>{done ?? <span className="text-brand-400">Ready</span>}</>;
  return (
    <span className="tabular-nums">
      {prefix} {formatDuration(left)}
    </span>
  );
}

export function AddressLink({ address, label }: { address?: string; label?: string }) {
  if (!address) return <span className="text-slate-500">—</span>;
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
    <div className="rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = "h-6 w-24" }: { className?: string }) {
  return <span className={`inline-block animate-pulse rounded bg-slate-800 ${className}`} />;
}

export function Alert({ tone = "warn", title, children }: { tone?: Tone; title: string; children?: ReactNode }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
    </div>
  );
}

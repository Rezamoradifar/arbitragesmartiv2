"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EXPLORER, formatDuration, secondsUntil } from "@/lib/contract";

/**
 * Shared primitives. The `Tone` union and class map are the single place
 * state colour is decided — components pass a meaning, never a hex, so a
 * palette change lands everywhere at once.
 *
 * `brand` is kept as an alias for gold rather than renamed, so the ~120 call
 * sites across the app did not all need touching for a colour change.
 */

export function Section({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-panel ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-tight text-white">{title}</h2>
          {description && <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "brand" | "volt";

const toneClasses: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/[.05] text-graphite-200",
  good: "border-success-400/25 bg-success-500/10 text-success-400",
  warn: "border-warn-400/25 bg-warn-500/10 text-warn-400",
  bad: "border-danger-400/25 bg-danger-500/10 text-danger-400",
  brand: "border-gold-400/30 bg-gold-500/10 text-gold-300",
  volt: "border-volt-400/30 bg-volt-500/10 text-volt-300",
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

/**
 * Label/value row.
 *
 * `shrink-0` on the label and `min-w-0` on the value are load-bearing: flex
 * children default to `min-width:auto`, so without them a long value refuses
 * to shrink below its intrinsic width and pushes the row off-screen. This
 * component is used across every page, so the bug appeared everywhere at once.
 */
export function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[.05] py-3 last:border-0">
      <span className="shrink-0 text-sm text-graphite-300">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-graphite-50">
        <span className="break-words">{value}</span>
        {hint && (
          <span className="ml-1.5 whitespace-nowrap text-xs font-normal text-graphite-400">{hint}</span>
        )}
      </span>
    </div>
  );
}

export function Progress({ value, max, tone = "brand" }: { value: number; max: number; tone?: Tone }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const bar: Record<Tone, string> = {
    neutral: "bg-gradient-to-r from-graphite-500 to-graphite-300",
    good: "bg-gradient-to-r from-success-600 to-success-400 shadow-[0_0_18px_-2px_rgba(16,185,129,.7)]",
    warn: "bg-gradient-to-r from-warn-500 to-warn-400 shadow-[0_0_18px_-2px_rgba(245,158,11,.7)]",
    bad: "bg-gradient-to-r from-danger-600 to-danger-400 shadow-[0_0_18px_-2px_rgba(239,68,68,.7)]",
    brand: "bg-gold-sheen shadow-[0_0_18px_-2px_rgba(224,173,60,.75)]",
    volt: "bg-volt-sheen shadow-[0_0_18px_-2px_rgba(51,132,251,.7)]",
  };
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full border border-white/[.05] bg-graphite-925"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${bar[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Counts a number up when it first scrolls into view.
 *
 * Deliberately one-shot and short: a figure that re-animates on every scroll
 * past is a figure nobody can read. Falls straight to the final value when
 * the user prefers reduced motion.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1400,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutExpo: fast, then settles — reads as decisive rather than lazy.
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setShown(value * eased);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {shown.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Fades and lifts a block the first time it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
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

  if (!target || Number(target) === 0) return <span className="text-graphite-400">—</span>;
  if (left <= 0) return <>{done ?? <span className="text-gold-400">Ready</span>}</>;
  return (
    <span className="tabular-nums">
      {prefix} {formatDuration(left)}
    </span>
  );
}

export function AddressLink({ address, label }: { address?: string; label?: string }) {
  if (!address) return <span className="text-graphite-400">—</span>;
  return (
    <a
      className="font-mono text-sm text-volt-400 underline underline-offset-2 transition hover:text-volt-300"
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
    <div className="rounded-xl border border-dashed border-white/[.08] px-6 py-12 text-center">
      <p className="text-sm font-medium text-graphite-200">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-sm text-sm text-graphite-400">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = "h-6 w-24" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-shimmer rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,.03)_25%,rgba(255,255,255,.09)_37%,rgba(255,255,255,.03)_63%)] bg-[length:200%_100%] ${className}`}
    />
  );
}

export function Alert({ tone = "warn", title, children }: { tone?: Tone; title: string; children?: ReactNode }) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 backdrop-blur ${toneClasses[tone]}`}>
      <p className="font-display text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm leading-relaxed opacity-90">{children}</div>}
    </div>
  );
}

/** Headline figure. `lead` marks the one card per view that gets gold. */
export function StatCard({
  label,
  value,
  sub,
  lead = false,
  loading = false,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  lead?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={`glass glass-hover p-5 sm:p-6 ${lead ? "glass-gold" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[.12em] text-graphite-400">{label}</p>
        {icon && <span className={lead ? "text-gold-400" : "text-volt-400"}>{icon}</span>}
      </div>
      <div className="stat-value mt-3">
        {loading ? <Skeleton className="h-9 w-28" /> : <span className={lead ? "text-gold-gradient" : ""}>{value}</span>}
      </div>
      {sub && <p className="mt-2 text-xs leading-relaxed text-graphite-400">{sub}</p>}
    </div>
  );
}

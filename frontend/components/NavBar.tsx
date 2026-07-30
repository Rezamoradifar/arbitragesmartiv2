"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGovernance } from "@/lib/hooks";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/security", label: "Security" },
  { href: "/partners", label: "Governance" },
  { href: "/activity", label: "Activity" },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const gov = useGovernance();

  const links = gov.isOwner ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[.06] bg-ink-950/60 backdrop-blur-xl supports-[backdrop-filter]:bg-ink-950/45">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <span className="h-2 w-2 rounded-sm bg-ink-950" />
          </span>
          <span className="font-display">ArbiSmart</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-white/[.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                  : "text-ink-300 hover:bg-white/[.04] hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://t.me/arbhub_site"
            target="_blank"
            rel="noreferrer"
            aria-label="Join our Telegram"
            className="hidden shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.04] p-2 text-ink-200 transition hover:bg-brand-500/15 hover:text-brand-300 sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.05 3.16 2.42 10.4c-1.27.51-1.26 1.22-.23 1.53l4.77 1.49 1.85 5.65c.22.62.36.86.74.86.34 0 .5-.16.7-.35l1.68-1.63 3.5 2.58c.64.36 1.11.17 1.27-.6l2.3-10.85c.24-.99-.38-1.44-1-.92zM8.6 13.6l8.9-5.6c.42-.26.8-.12.49.17l-7.2 6.5-.28 3.02z" />
            </svg>
          </a>
          <ConnectButton showBalance={false} chainStatus="icon" />
          <button
            className="rounded-lg border border-white/10 bg-white/[.04] p-2 text-ink-200 transition hover:bg-white/[.08] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/[.06] lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  pathname === l.href ? "bg-white/[.07] text-white" : "text-ink-300 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

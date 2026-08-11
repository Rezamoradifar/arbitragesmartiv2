"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGovernance } from "@/lib/hooks";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Desktop header. The mobile counterpart is {MobileNav} — a bottom bar rather
 * than a hamburger, because on a phone the primary destinations should be
 * reachable by thumb without opening anything.
 */

const baseLinks: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/portfolio", label: "Portfolio", icon: "chart" },
  { href: "/rewards", label: "Rewards", icon: "zap" },
  { href: "/security", label: "Security", icon: "shield" },
  { href: "/partners", label: "Governance", icon: "users" },
  { href: "/activity", label: "Activity", icon: "activity" },
];

export function NavBar() {
  const pathname = usePathname();
  const gov = useGovernance();
  const [scrolled, setScrolled] = useState(false);

  // The header only earns its background once content is behind it; over the
  // hero it should be invisible so the visual runs to the top of the viewport.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = gov.isOwner ? [...baseLinks, { href: "/admin", label: "Admin", icon: "settings" as IconName }] : baseLinks;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/[.06] bg-graphite-950/70 backdrop-blur-2xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container-page flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-[17px] font-bold tracking-[-.01em] text-white">
            ARBI<span className="text-gold-gradient">SMART</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${
                  active ? "text-white" : "text-graphite-300 hover:text-white"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://t.me/arbhub_site"
            target="_blank"
            rel="noreferrer"
            aria-label="Join our Telegram"
            className="hidden shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] p-2 text-graphite-300 transition hover:border-volt-400/30 hover:text-volt-300 sm:flex"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M21.05 3.16 2.42 10.4c-1.27.51-1.26 1.22-.23 1.53l4.77 1.49 1.85 5.65c.22.62.36.86.74.86.34 0 .5-.16.7-.35l1.68-1.63 3.5 2.58c.64.36 1.11.17 1.27-.6l2.3-10.85c.24-.99-.38-1.44-1-.92zM8.6 13.6l8.9-5.6c.42-.26.8-.12.49.17l-7.2 6.5-.28 3.02z" />
            </svg>
          </a>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}

/** The rounded-square mark, shared with the Telegram channel avatar. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-[9px] bg-gold-sheen shadow-gold"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="rounded-[3px] bg-graphite-950" style={{ width: size * 0.28, height: size * 0.28 }} />
    </span>
  );
}

/**
 * Mobile bottom navigation.
 *
 * Five destinations maximum — past that the targets fall below the ~44px
 * comfortable minimum on a small phone. `safe-bottom` keeps it clear of the
 * iOS home indicator, and the layout adds matching padding so the bar never
 * covers the last row of content.
 */
export function MobileNav() {
  const pathname = usePathname();
  const gov = useGovernance();

  const items: Array<{ href: string; label: string; icon: IconName }> = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/dashboard", label: "Dashboard", icon: "grid" },
    { href: "/portfolio", label: "Portfolio", icon: "chart" },
    { href: "/activity", label: "Activity", icon: "activity" },
    gov.isOwner
      ? { href: "/admin", label: "Admin", icon: "settings" }
      : { href: "/security", label: "Security", icon: "shield" },
  ];

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[.07] bg-graphite-950/85 backdrop-blur-2xl lg:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5"
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
              )}
              <Icon
                name={it.icon}
                className={`h-[19px] w-[19px] transition ${active ? "text-gold-400" : "text-graphite-400"}`}
              />
              <span
                className={`truncate text-[10px] font-medium leading-none transition ${
                  active ? "text-white" : "text-graphite-400"
                }`}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

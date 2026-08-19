"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGovernance } from "@/lib/hooks";
import { WalletConnectButton } from "@/components/WalletConnect";
import { Icon, type IconName } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useT } from "@/components/LocaleProvider";

/**
 * Desktop header. The counterpart is {MobileNav} — a bottom bar rather than a
 * hamburger, because on a phone the primary destinations should be reachable
 * by thumb without opening anything.
 *
 * The full row appears at xl, not lg. Eight items fit at 1024px in English and
 * in almost nothing else: German and Japanese labels are half again as wide
 * and wrapped the header onto two lines, taking the connect button with them.
 * Below xl the bottom bar carries navigation, which it already did on phones.
 */

/** `key` indexes the dictionary; the visible label is resolved at render. */
type NavKey = keyof ReturnType<typeof useT>["nav"];

const baseLinks: Array<{ href: string; key: NavKey; icon: IconName }> = [
  { href: "/", key: "home", icon: "home" },
  { href: "/dashboard", key: "dashboard", icon: "grid" },
  { href: "/get-usdt", key: "exchange", icon: "swap" },
  { href: "/portfolio", key: "portfolio", icon: "chart" },
  { href: "/rewards", key: "rewards", icon: "zap" },
  { href: "/security", key: "security", icon: "shield" },
  { href: "/partners", key: "governance", icon: "users" },
  { href: "/activity", key: "activity", icon: "activity" },
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

  const t = useT();
  const links = gov.isOwner
    ? [...baseLinks, { href: "/admin", key: "admin" as NavKey, icon: "settings" as IconName }]
    : baseLinks;

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

        <nav className="hidden items-center gap-0.5 xl:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                  active ? "text-white" : "text-graphite-300 hover:text-white"
                }`}
              >
                {t.nav[l.key]}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <a
            href="https://t.me/arbhub_site"
            target="_blank"
            rel="noreferrer"
            aria-label={t.header.telegram}
            className="hidden shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.03] p-2 text-graphite-300 transition hover:border-volt-400/30 hover:text-volt-300 sm:flex"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M21.05 3.16 2.42 10.4c-1.27.51-1.26 1.22-.23 1.53l4.77 1.49 1.85 5.65c.22.62.36.86.74.86.34 0 .5-.16.7-.35l1.68-1.63 3.5 2.58c.64.36 1.11.17 1.27-.6l2.3-10.85c.24-.99-.38-1.44-1-.92zM8.6 13.6l8.9-5.6c.42-.26.8-.12.49.17l-7.2 6.5-.28 3.02z" />
            </svg>
          </a>
          <WalletConnectButton />
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
 * Five destinations. Six would put each target near 62px on a 375px screen —
 * still above the ~44px comfortable minimum, but the labels start to crowd, so
 * the fifth slot is spent rather than added to.
 *
 * Exchange takes the slot Activity had. Activity is a decoded event feed,
 * which is a page for people already deposited and curious; converting funds
 * is the step every single new user is stuck on, and it was reachable only
 * from the footer. Activity stays in the desktop nav and the footer.
 *
 * Labelled Exchange, not Swap, because that is the word the converter itself
 * puts at the top of its own panel — two names for one destination is how a
 * user decides they are different things.
 *
 * `safe-bottom` keeps the bar clear of the iOS home indicator, and the layout
 * adds matching padding so it never covers the last row of content.
 */
export function MobileNav() {
  const pathname = usePathname();
  const gov = useGovernance();

  const t = useT();

  const items: Array<{ href: string; key: NavKey; icon: IconName }> = [
    { href: "/", key: "home", icon: "home" },
    { href: "/dashboard", key: "dashboard", icon: "grid" },
    { href: "/get-usdt", key: "exchange", icon: "swap" },
    { href: "/portfolio", key: "portfolio", icon: "chart" },
    gov.isOwner
      ? { href: "/admin", key: "admin", icon: "settings" }
      : { href: "/security", key: "security", icon: "shield" },
  ];

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[.07] bg-graphite-950/85 backdrop-blur-2xl xl:hidden"
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
                {t.nav[it.key]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

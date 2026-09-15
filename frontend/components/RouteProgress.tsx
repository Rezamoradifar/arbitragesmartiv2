"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A slim top-of-viewport progress bar for route changes — the same cue
 * GitHub, YouTube and Vercel use so a click reads as "working" instead of
 * "did nothing" for however long the next route's chunk takes to arrive.
 *
 * The App Router has no public "navigation started" event, so the start
 * signal comes from listening for clicks on same-tab, same-origin links
 * (capture phase, before Next's own handler navigates) and the finish
 * signal comes from the committed pathname actually changing. A click that
 * never lands (blocked, cancelled, opened a menu instead) self-clears on a
 * timeout so the bar can never get stuck.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<{ trickle?: ReturnType<typeof setInterval>; stuck?: ReturnType<typeof setTimeout> }>({});
  const started = useRef(false);

  const clearTimers = () => {
    if (timers.current.trickle) clearInterval(timers.current.trickle);
    if (timers.current.stuck) clearTimeout(timers.current.stuck);
  };

  const finish = () => {
    clearTimers();
    setProgress(100);
    setTimeout(() => setVisible(false), 200);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearTimers();
      started.current = true;
      setVisible(true);
      setProgress(12);
      // Trickles toward, but never reaches, completion on its own — real
      // completion only ever comes from the pathname actually changing.
      timers.current.trickle = setInterval(() => {
        setProgress((p) => (p >= 88 ? p : p + (88 - p) * 0.15));
      }, 200);
      timers.current.stuck = setTimeout(finish, 4000);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started.current) return;
    started.current = false;
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-gold-sheen bg-[length:200%_100%] shadow-gold transition-[width] duration-300 ease-out animate-shimmer motion-reduce:animate-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

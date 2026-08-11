"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export type Theme = "dark" | "light";

export const THEME_KEY = "arbismart-theme";

/**
 * Applied before paint by the inline script in the layout, and again here on
 * every change. Kept in one exported function so the two can never drift.
 */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function preferred(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * The active theme, for the parts of the UI that cannot be styled with CSS
 * variables — RainbowKit's modal takes a JavaScript theme object.
 *
 * Reads the attribute the inline script already set and watches it, rather
 * than keeping a second copy of the state in a context. The DOM is the source
 * of truth here precisely because something outside React writes it first.
 */
export function useThemeName(): Theme {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.dataset.theme === "light" ? "light" : "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return theme;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Starts undefined rather than guessing. Rendering "dark" on the server and
  // finding "light" in storage on the client is a hydration mismatch, and the
  // icon would visibly flip on load.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(preferred());
  }, []);

  // Follow the system while the user has not chosen. Once they have, their
  // choice wins and the OS switching at sunset stops overriding it.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_KEY)) return;
      const next: Theme = e.matches ? "light" : "dark";
      setTheme(next);
      applyTheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  }

  const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.03] text-graphite-300 transition hover:border-gold-400/25 hover:text-gold-300 ${className}`}
    >
      {/* Nothing until mounted: the correct glyph is not knowable on the
          server, and a wrong one that swaps is worse than a beat of nothing. */}
      {theme === null ? (
        <span className="h-[18px] w-[18px]" />
      ) : (
        <Icon name={theme === "light" ? "moon" : "sun"} className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}

/**
 * Runs before the first paint, ahead of React, so the page never renders in
 * the wrong theme and flashes. Inlined as a string because it has to execute
 * synchronously in <head> — a module would be too late.
 */
export const themeScript = `
(function(){try{
  var k=${JSON.stringify(THEME_KEY)};
  var s=localStorage.getItem(k);
  var t=(s==="dark"||s==="light")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
  document.documentElement.dataset.theme=t;
}catch(e){document.documentElement.dataset.theme="dark";}})();
`;

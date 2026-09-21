"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/components/LocaleProvider";

/**
 * Seventeen languages is too many for a row of flags and too many for a
 * native select that renders differently on every platform. A popover listing
 * endonyms is the version that stays legible.
 *
 * No flags anywhere: a flag is a country, and none of these languages belongs
 * to one country.
 */
export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.header.language}
        title={t.header.language}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/[.08] bg-white/[.03] px-2.5 text-graphite-300 transition hover:border-gold-400/25 hover:text-gold-300"
      >
        <Icon name="globe" className="h-[17px] w-[17px]" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{locale}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t.header.language}
          className="glass absolute right-0 top-11 z-50 max-h-[60vh] w-52 overflow-y-auto p-1.5"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active ? "bg-gold-400/10 text-gold-300" : "text-graphite-200 hover:bg-white/[.05]"
                }`}
              >
                <span className="truncate">{LOCALE_NAMES[code]}</span>
                {active && <Icon name="check" className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

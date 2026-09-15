"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_KEY,
  detectLocale,
  dirFor,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { DICTIONARIES, type Dict } from "@/lib/i18n/dictionaries";

type Ctx = {
  locale: Locale;
  t: Dict;
  setLocale: (next: Locale) => void;
  /** False until the stored choice has been read, so nothing flashes. */
  ready: boolean;
};

const LocaleContext = createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  t: DICTIONARIES[DEFAULT_LOCALE],
  setLocale: () => {},
  ready: false,
});

export function useLocale() {
  return useContext(LocaleContext);
}

/** Just the strings, for the common case. */
export function useT(): Dict {
  return useContext(LocaleContext).t;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Always starts at the default. The server has no way to know the visitor's
  // language, and rendering a guess would mean hydrating different text than
  // was sent — React discards the tree and the page visibly rebuilds.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    const next = isLocale(stored) ? stored : detectLocale(navigator.languages ?? [navigator.language]);
    setLocaleState(next);
    setReady(true);
  }, []);

  // lang and dir belong on <html>, and only the browser can set them here.
  // Screen readers pick pronunciation from lang; without it a Thai page is
  // read aloud as English.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, t: DICTIONARIES[locale], setLocale, ready }),
    [locale, setLocale, ready],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

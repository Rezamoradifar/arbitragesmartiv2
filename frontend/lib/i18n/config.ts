/**
 * The seventeen languages the site speaks.
 *
 * The list matches the converter's own, so a visitor never meets a page in
 * their language holding a widget that is not — the mismatch reads as a
 * bolted-on translation and undoes the point of having one.
 *
 * Locale lives in localStorage rather than in the URL. A `[locale]` segment
 * would be better for search — one indexable page per language, proper
 * hreflang — but it means moving all twelve routes under a dynamic segment,
 * and most people arrive here from a Telegram link rather than from a search
 * result. The dictionaries are keyed so that switching to routed locales later
 * changes the plumbing and none of the translations.
 */

export const LOCALES = [
  "en", "de", "es", "fr", "it", "pt", "pl", "uk", "tr",
  "hi", "bn", "id", "vi", "th", "ja", "ko", "zh",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Endonyms — each language written the way its own speakers write it. A
 * picker that lists "German" to a German speaker is a picker written for
 * someone else.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  pl: "Polski",
  uk: "Українська",
  tr: "Türkçe",
  hi: "हिन्दी",
  bn: "বাংলা",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  th: "ไทย",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

/**
 * Right-to-left scripts. Empty for now — every language in the current set
 * runs left to right. The machinery stays because Persian is the obvious next
 * addition and it would mirror the whole layout; better to have the seam
 * already cut than to discover it later.
 */
export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>();

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_KEY = "arbismart-locale";

/**
 * Best match for the browser's languages, ignoring region: a visitor with
 * pt-BR gets Portuguese rather than English, which matters more than the
 * distinction between the two Portugueses on a page of interface labels.
 */
export function detectLocale(candidates: readonly string[]): Locale {
  for (const tag of candidates) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

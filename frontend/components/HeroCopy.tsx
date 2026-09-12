"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useLocale, useT } from "@/components/LocaleProvider";

/**
 * The first screen's words, split out so the home page stays a server
 * component while this part follows the chosen language. Markup and the
 * staggered entrance are unchanged from when it was inline.
 */
export function HeroCopy() {
  const t = useT();

  return (
    <div className="max-w-2xl">
      <span className="eyebrow animate-fade-up">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
        </span>
        {t.hero.badge}
      </span>

      <h1 className="h-display mt-7 animate-fade-up animate-delay-100">
        ARBI<span className="text-gold-gradient">SMART</span>
      </h1>

      <p className="mt-5 animate-fade-up animate-delay-200 font-display text-xl font-medium tracking-tight text-graphite-100 sm:text-2xl">
        {t.hero.tagline}
      </p>

      <p className="mt-5 max-w-xl animate-fade-up animate-delay-300 text-[15px] leading-relaxed text-graphite-300 sm:text-base">
        {t.hero.lede}
      </p>

      <div className="mt-9 flex animate-fade-up animate-delay-500 flex-wrap items-center gap-3">
        <Link href="/dashboard" className="btn-primary">
          {t.actions.launch}
          <Icon name="arrowUp" className="h-4 w-4 rotate-45" />
        </Link>
        <Link href="/security" className="btn-secondary">
          {t.actions.explore}
        </Link>
      </div>

      <div className="mt-10 flex animate-fade-in animate-delay-700 flex-wrap items-center gap-x-6 gap-y-3 text-xs text-graphite-400">
        {[t.hero.verified, t.hero.nonCustodial, t.hero.exitOpen].map((claim) => (
          <span key={claim} className="inline-flex items-center gap-1.5">
            <Icon name="check" className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.4} />
            {claim}
          </span>
        ))}
      </div>

      {/*
        The headline says what this is built to do. The strategy is not
        trading yet, and the live panel a screen below reports realized
        profit as zero — so without this line the two contradict each other
        within one scroll, and the visitor decides which one is the lie.
        Saying it here first costs a claim and buys the only thing that makes
        the rest of the page worth reading.
      */}
      <p className="mt-6 max-w-xl animate-fade-in animate-delay-700 text-xs leading-relaxed text-graphite-500">
        The strategy is not trading yet — realized profit is 0, and today&apos;s yield is paid from
        capital, not from earnings.{" "}
        <Link href="/strategy" className="text-gold-400 underline underline-offset-2 hover:text-gold-300">
          Why, and the arithmetic behind it
        </Link>
      </p>
    </div>
  );
}

/**
 * Shown at the top of a page whose body copy is still English.
 *
 * Silence would be the worse option: a visitor who switched to Korean and
 * then met a wall of English would reasonably conclude the switcher is
 * broken, rather than that this page is simply next in the queue.
 */
export function UntranslatedNotice() {
  const { t, locale } = useLocale();
  if (locale === "en") return null;

  return (
    <div className="glass mb-8 flex items-start gap-3 p-4">
      <Icon name="globe" className="mt-0.5 h-4 w-4 shrink-0 text-graphite-400" />
      <p className="text-xs leading-relaxed text-graphite-400">{t.partial}</p>
    </div>
  );
}

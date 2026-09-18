import Link from "next/link";
import { Icon } from "@/components/Icon";
import { GoldBar } from "@/components/GoldBar";

/**
 * Homepage teaser for the /rewards programme. Kept to what that page itself
 * states — thresholds and round dates are still being set, so this says so
 * too rather than implying a number that isn't fixed yet.
 */
export function GoldRewardsBanner() {
  return (
    <div className="glass glass-gold overflow-hidden p-6 sm:p-8">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 shadow-[0_0_10px_2px_rgba(224,173,60,.6)]" />
            Rewards programme
          </p>
          <h2 className="h-section mt-4">
            Real <span className="text-gold-gradient">gold</span> for the team you build
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-graphite-300">
            Nine tiers, a gram to a full kilo, measured on your whole team three levels deep — a
            number the contract already tracks. Thresholds and round dates are still being
            finalised, but your team volume is being recorded today, whatever they turn out to be.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/rewards" className="btn-primary">
              See the rewards
              <Icon name="arrowUp" className="h-4 w-4 rotate-45" />
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Check your team volume
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 items-end gap-4 justify-self-center lg:justify-self-end">
          <GoldBar grams={1} />
          <GoldBar grams={50} />
          <GoldBar grams={1000} lead />
        </div>
      </div>
    </div>
  );
}

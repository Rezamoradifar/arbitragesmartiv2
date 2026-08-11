import type { Metadata } from "next";
import Link from "next/link";
import { GoldClaimForm } from "@/components/GoldClaimForm";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Claim a gold reward",
  description:
    "Claim a physical gold bar earned on ArbiSmart. Signed from the winning wallet; delivery details never touch our servers.",
};

const PRINCIPLES = [
  {
    icon: "lock" as const,
    title: "Your details never reach our servers",
    body: "The form runs entirely in your browser. There is no endpoint behind it and no database. You send the finished claim yourself, to an address you can see.",
  },
  {
    icon: "shield" as const,
    title: "The signature is what proves it is yours",
    body: "Only the wallet that earned the reward can produce it. It costs no gas, moves no funds, and grants no permission over your position or your balance.",
  },
  {
    icon: "info" as const,
    title: "No document upload",
    body: "We check your ID when the shipment is arranged, with a person. A passport scan sitting in an inbox for months protects nobody and would be ours to lose.",
  },
];

export default function ClaimPage() {
  return (
    <div className="container-page space-y-12 py-16">
      <div className="max-w-2xl">
        <Link
          href="/rewards"
          className="text-sm text-gold-300 underline underline-offset-2 hover:text-gold-300"
        >
          ← Gold rewards
        </Link>
        <h1 className="h-page mt-4">Claim a gold reward</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-graphite-300">
          A bar cannot be posted to a wallet address, so this is the one place on the site that asks
          for a name and an address. It asks for as little as a courier needs, and keeps none of it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="glass p-5">
            <Icon name={p.icon} className="h-5 w-5 text-gold-300" />
            <h2 className="mt-3 font-display text-sm font-semibold text-white">{p.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-graphite-400">{p.body}</p>
          </div>
        ))}
      </div>

      <GoldClaimForm />

      <div className="glass p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-white">If someone else asks you for this</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-graphite-300">
          This page, at arbhub.site, is the only place we ever collect delivery details, and
          support@arbhub.site is the only address we reply from. We will never ask for a seed
          phrase, a private key, or a fee to release a prize. A prize that requires a payment first
          is not a prize, and it is not us.
        </p>
      </div>
    </div>
  );
}

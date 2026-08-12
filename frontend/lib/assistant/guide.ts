import {
  CONTRACT_ADDRESS,
  COLLATERAL_ADDRESS,
  PLANS,
  DEPOSIT_FEE_BANDS,
  PENALTY_SCHEDULE,
  REFERRAL_LEVELS,
  grossForNet,
} from "@/lib/contract";

/**
 * The assistant without a model behind it.
 *
 * This is the default, and it runs in the browser: no API key, no request, no
 * bill, no rate limit, and nothing that can be down. Every answer is written
 * out here and every figure in one is interpolated from the same constants the
 * rest of the interface renders, so the assistant cannot drift from the site
 * and cannot invent a number — the failure mode a language model has on a page
 * where people are deciding what to do with money.
 *
 * What it gives up is conversation. It answers the questions on this list and
 * says so plainly when a question is not on it, rather than guessing. For
 * "where do I start", which is the question this was built for, that trade is
 * the right way round.
 */

export type Topic = {
  id: string;
  /** Shown as a chip, and matched against as well. */
  question: string;
  keywords: string[];
  answer: string;
};

const pct = (bps: number) => `${bps / 100}%`;
const minDeposit = grossForNet(10).toFixed(2);

const planLines = PLANS.map(
  (p) => `• ${p.name} — from ${p.minStake} USDT, ${pct(p.dailyBps)} a day for ${p.durationDays} days`,
).join("\n");

const feeLines = [...DEPOSIT_FEE_BANDS]
  .reverse()
  .map((b) => (b.from === 0 ? `• under 500 USDT — ${pct(b.bps)}` : `• ${b.from} USDT and above — ${pct(b.bps)}`))
  .join("\n");

const penaltyLines = PENALTY_SCHEDULE.map((p) => `• ${p.label} — you lose ${pct(p.bps)} of your principal`).join("\n");

const tierLines = REFERRAL_LEVELS.map((r) =>
  r.level === 0
    ? `• ${r.name} — ${pct(r.f1Bps)} / ${pct(r.f2Bps)} / none. No requirements.`
    : `• ${r.name} — ${pct(r.f1Bps)} / ${pct(r.f2Bps)} / ${pct(r.f3Bps)}. Needs ${r.needStake} USDT staked by you, ${r.needVolume} USDT direct volume and ${r.needRefs} active referrals, all three.`,
).join("\n");

export const TOPICS: Topic[] = [
  {
    id: "start",
    question: "How do I start?",
    keywords: ["start", "begin", "how do i", "first", "new", "getting started", "guide", "signup", "sign up", "register"],
    answer: `Four steps.

1. Put USDT on Polygon in your wallet, and a little POL for gas. The Exchange page (/get-usdt) converts almost any coin on almost any network into Polygon USDT.
2. Connect the wallet on this site.
3. Approve USDT once, then deposit. The smallest deposit that works is ${minDeposit} USDT.
4. Watch it on /dashboard. You claim yield yourself; nothing is automatic.

There is no account, no email and no password. Your wallet is the account.`,
  },
  {
    id: "minimum",
    question: "What is the minimum deposit?",
    keywords: ["minimum", "min", "smallest", "least", "how much can i start", "10 usdt", "maximum", "max", "limit"],
    answer: `The contract requires 10 USDT to remain AFTER the entry fee, so the smallest deposit that actually works is ${minDeposit} USDT. Sending exactly 10 is rejected — this catches people out.

The maximum for a single stake is 25,000 USDT.`,
  },
  {
    id: "fees",
    question: "What does it cost to deposit?",
    keywords: ["fee", "fees", "cost", "charge", "commission", "deposit fee", "entry", "how much do you take"],
    answer: `An entry fee is taken before the stake is recorded, on a sliding scale:

${feeLines}

So the rate you earn applies to what is recorded, not to what you sent. There is also a claim fee of 10% on the yield you claim, halved to 5% on the Advanced and Elite plans. It is charged on yield only and never on principal.

Full numbers on /security.`,
  },
  {
    id: "plans",
    question: "What are the plans and rates?",
    keywords: [
      "plan", "plans", "rate", "rates", "apy", "apr", "interest", "daily", "per day",
      "percent", "percentage", "profit", "earn", "return", "returns", "how much will i make",
    ],
    answer: `Four plans. Which one you get is decided by the stake recorded after the entry fee, not by what you sent.

${planLines}

These are settings compiled into the contract, not a forecast. What the contract can pay depends on what is in it, which you can check yourself on /dashboard and on Polygonscan.`,
  },
  {
    id: "exit",
    question: "What if I want to leave early?",
    keywords: [
      "exit", "leave", "early", "withdraw", "withdrawal", "unstake", "penalty", "cancel",
      "money back", "my money", "quit", "stop", "take it out", "get out",
    ],
    answer: `Exit is open at all times — while paused, and even for a blacklisted address, and nobody has to approve it. But it is expensive early, and the penalty comes out of your PRINCIPAL, not out of your yield:

${penaltyLines}

Those are percentages of your recorded stake. Exiting a 900 USDT position in week 1 returns 450 USDT. Any yield you have not claimed is lost on top of that, so claim before you exit — but claiming does not reduce the penalty on the principal.

There is no penalty-free withdrawal at the end of the term either: after the term ends, yield stops accruing and exit still charges the week 5+ rate of 10%.`,
  },
  {
    id: "claim",
    question: "How and when do I claim?",
    keywords: ["claim", "harvest", "collect", "payout", "when do i get paid", "reward", "yield"],
    answer: `Yield accrues every day and you claim it whenever you want from /dashboard. Nothing is sent automatically and nothing compounds by itself.

The claim fee is 10% of the amount claimed, or 5% on Advanced and Elite. Principal is never charged.

Two things come out of a claim, not one. If you joined through somebody's referral link, their reward is also taken out of your claim rather than paid by the protocol on top of it — between 8% and 35% of your yield, depending on how many active people are above you and what tier they hold. If you joined without a referral link, nothing is deducted for that. Your principal is not touched either way. The dashboard shows your exact figure once your wallet is connected.`,
  },
  {
    id: "referral",
    question: "How do referrals pay?",
    keywords: ["referral", "refer", "invite", "team", "commission", "downline", "affiliate", "friend", "link"],
    answer: `Three levels, paid from the team member's claim — not from their principal, and not from your own balance.

Percentages below are level 1 / level 2 / level 3:

${tierLines}

Your link is on /dashboard once you are connected. Requirements are checked live, so a tier can be lost as well as gained.`,
  },
  {
    id: "usdt",
    question: "How do I get USDT on Polygon?",
    keywords: ["usdt", "tether", "polygon", "network", "bridge", "swap", "exchange", "convert", "buy", "matic", "erc20", "trc20", "bep20"],
    answer: `Go to /get-usdt. It converts most coins on most networks into Polygon USDT in one step, and it shows the exact token address to check against.

Two things people get wrong: USDT on Ethereum, Tron or BSC is a different token and will not arrive here, and you need a small amount of POL on Polygon to pay gas. A wallet holding only USDT cannot send a transaction.

The token this contract accepts is ${COLLATERAL_ADDRESS}.`,
  },
  {
    id: "gas",
    question: "Why do I need POL?",
    keywords: ["gas", "pol", "matic", "fee for transaction", "insufficient funds", "cannot send", "stuck", "transaction failed"],
    answer: `Every Polygon transaction costs gas, and gas is paid in POL — never in USDT. A wallet holding only USDT cannot approve or deposit.

You need very little, well under a dollar's worth for many transactions. The Exchange page (/get-usdt) can supply some alongside your USDT.`,
  },
  {
    id: "safety",
    question: "Can you take my money?",
    keywords: ["safe", "safety", "secure", "security", "rug", "scam", "trust", "audit", "risk", "owner", "admin", "steal", "custody"],
    answer: `We cannot take it — there is no function that sends staked principal to an owner wallet, and exit is permissionless and open at all times, so withdrawing does not depend on us being cooperative or even present.

But you can lose principal to the early-exit penalty, which is charged on the stake itself: 50% in week 1, down to 10% from week 5. That is a real way to end up with less than you put in, and it is worth knowing before you deposit rather than after.

What you should weigh instead: the yield is paid from what the contract holds, so it depends on the strategy performing and on the contract being funded. That is a real risk and no code removes it.

The source is verified on Sourcify with an exact bytecode match, so what is deployed is what is published. /security sets out what the owner can and cannot do, including the parts that are unflattering.`,
  },
  {
    id: "contract",
    question: "What is the contract address?",
    keywords: ["contract", "address", "polygonscan", "verify", "source", "code", "explorer", "chain id"],
    answer: `Staking contract: ${CONTRACT_ADDRESS}
USDT it accepts: ${COLLATERAL_ADDRESS}
Network: Polygon mainnet, chain id 137.

Verified on Sourcify, exact match on both creation and runtime bytecode. Check it on Polygonscan rather than taking our word for it.`,
  },
  {
    id: "wallet",
    question: "My wallet will not connect.",
    keywords: ["connect", "wallet", "metamask", "trust", "rainbow", "walletconnect", "not working", "cannot connect", "button"],
    answer: `Three things fix nearly all of it. Switch the wallet to Polygon — the site will prompt, but some wallets ignore the prompt. Open the site in the wallet's own browser if you are on a phone. And if a previous session is stuck, disconnect the site inside the wallet's settings and connect again.

Only connect on arbhub.site. Anything else asking you to connect for ArbiSmart is not us.`,
  },
  {
    id: "gold",
    question: "What are the gold rewards?",
    keywords: ["gold", "bar", "bullion", "prize", "reward program", "kg", "gram", "contest", "competition"],
    answer: `A time-limited programme paying physical gold, from 1 gram up to 1 kilogram, against team volume.

The thresholds and the round dates are still being set, so there are no numbers to give you yet and I will not invent one. /rewards shows the tiers and will carry the figures the moment they are fixed.`,
  },
  {
    id: "seedphrase",
    question: "Someone asked for my seed phrase.",
    keywords: ["seed", "phrase", "private key", "password", "12 words", "recovery", "support asked", "admin dm", "impersonator", "fake"],
    answer: `That is a theft attempt, without exception. ArbiSmart never asks for a seed phrase, a private key or a password, and neither does any legitimate wallet or exchange. Anyone who does is stealing from you.

Only two things are ours: this site at arbhub.site, and @arbhub_site on Telegram. Every other channel, group, "support agent" or admin DM claiming to be ArbiSmart is an impersonator. We will never message you first.`,
  },
  {
    id: "advice",
    question: "Should I invest?",
    keywords: [
      "should i", "worth it", "good investment", "good idea", "recommend", "advice",
      "advise", "is it worth", "do you think", "how much should i", "convince",
    ],
    answer: `That is your decision and I will not push it either way — not how much, not whether.

What should inform it: the rate is a setting compiled into a contract, not a forecast; the yield is paid from what the contract holds, so it depends on the strategy performing; exit is open at all times but the early-exit penalty is charged on principal, not on yield; and the entry and claim fees are real money off the top.

Read /security before you decide. It is written to include the parts that do not flatter us.`,
  },
  {
    id: "support",
    question: "How do I contact a human?",
    keywords: [
      "support", "contact", "help", "human", "person", "someone", "somebody", "talk", "speak",
      "agent", "email", "telegram", "who are you", "where are you", "complaint",
    ],
    answer: `Telegram: https://t.me/arbhub_site

That is the only way to reach us. There is no support email yet — anything
claiming to be an ArbiSmart support address is not us.

The operation is based in Malaysia. Support will never message you first and will never ask for a seed phrase.`,
  },
];

/** Strip case and punctuation so "How much?!" and "how much" match alike. */
function normalise(s: string): string {
  return ` ${s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

/**
 * Pick a topic, or nothing.
 *
 * Longer keywords score higher, so "private key" beats a stray "key", and a
 * single weak hit is not enough to answer on. Returning null is a perfectly
 * good outcome — the caller says it does not know, which beats confidently
 * answering the wrong question.
 */
export function findTopic(input: string): Topic | null {
  const text = normalise(input);
  if (text.trim().length < 2) return null;

  let best: Topic | null = null;
  let bestScore = 0;

  for (const topic of TOPICS) {
    let score = 0;
    for (const kw of [...topic.keywords, topic.question]) {
      const needle = normalise(kw).trim();
      if (!needle) continue;
      // Whole words only. Matching inside a word makes "key" fire on "monkey"
      // and puts the answer to a question nobody asked in front of someone.
      if (text.includes(` ${needle} `)) {
        // Weight by word count, then by length: a matched phrase says far more
        // about intent than a matched word.
        score += needle.split(" ").length * 10 + needle.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  return bestScore >= 12 ? best : null;
}

export const NO_MATCH = `I do not have an answer written for that one, and I would rather say so than guess.

The pages that hold the detail: /security for fees, penalties and what the owner can do, /dashboard for your own position, /get-usdt for funding, /rewards for the gold programme.

A person will answer at https://t.me/arbhub_site.`;

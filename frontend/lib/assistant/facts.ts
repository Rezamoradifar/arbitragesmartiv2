import { createPublicClient, formatUnits, type Abi } from "viem";
import { polygon } from "viem/chains";
import { polygonTransport } from "@/lib/rpc";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  COLLATERAL_ADDRESS,
  ERC20_ABI,
  PLANS,
  DEPOSIT_FEE_BANDS,
  PENALTY_SCHEDULE,
  REFERRAL_LEVELS,
  grossForNet,
} from "@/lib/contract";

/**
 * Everything the assistant is allowed to state as fact.
 *
 * The rule the whole feature rests on: it may not produce a number that is
 * not in this block. Rates, fees, penalties and addresses are read from the
 * same constants the interface renders, and the live figures come off the
 * chain at request time — so the assistant cannot drift from the site, and
 * the site cannot drift from the contract.
 *
 * Anything a visitor asks that this does not cover gets "I don't know" and a
 * link. On a page where people are deciding what to do with money, a
 * confident wrong answer is worse than no answer.
 */

const client = createPublicClient({
  chain: polygon,
  transport: polygonTransport,
});

type Live = {
  totalStaked: string;
  contractBalance: string;
  paused: boolean;
  partnerCount: number;
  emergencyOpen: boolean;
  fetchedAt: number;
};

let cache: Live | null = null;
const TTL = 60_000;

/**
 * One RPC round trip a minute at most. Every visitor asking a question does
 * not need their own read of the same block.
 */
async function live(): Promise<Live | null> {
  if (cache && Date.now() - cache.fetchedAt < TTL) return cache;

  try {
    const [staked, balance, paused, partners, emergency] = await client.multicall({
      contracts: [
        { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI as Abi, functionName: "totalStaked" },
        {
          address: COLLATERAL_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [CONTRACT_ADDRESS],
        },
        { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI as Abi, functionName: "paused" },
        { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI as Abi, functionName: "partnerCount" },
        { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI as Abi, functionName: "emergencyWithdrawOpen" },
      ],
      allowFailure: true,
    });

    const num = (r: { status: string; result?: unknown }) =>
      r.status === "success" ? (r.result as bigint) : 0n;

    cache = {
      totalStaked: formatUnits(num(staked), 6),
      contractBalance: formatUnits(num(balance), 6),
      paused: paused.status === "success" ? Boolean(paused.result) : false,
      partnerCount: Number(num(partners)),
      emergencyOpen: emergency.status === "success" ? Boolean(emergency.result) : false,
      fetchedAt: Date.now(),
    };
    return cache;
  } catch {
    // A failed read must not take the assistant down with it — it answers
    // from the static facts and says the live numbers are unavailable.
    return null;
  }
}

export async function buildFacts(): Promise<string> {
  const l = await live();
  const minGross = grossForNet(10);

  const plans = PLANS.map(
    (p) =>
      `  ${p.name}: from ${p.minStake} USDT, ${(p.dailyBps / 100).toFixed(2)}% per day, ${p.durationDays} days`,
  ).join("\n");

  const fees = [...DEPOSIT_FEE_BANDS]
    .reverse()
    .map((b) => (b.from === 0 ? `  under 500 USDT: 12%` : `  from ${b.from} USDT: ${b.bps / 100}%`))
    .join("\n");

  const penalties = PENALTY_SCHEDULE.map((p) => `  ${p.label}: ${p.bps / 100}%`).join("\n");

  const tiers = REFERRAL_LEVELS.map(
    (r) =>
      `  ${r.name}: level 1 ${r.f1Bps / 100}%, level 2 ${r.f2Bps / 100}%, level 3 ${
        r.f3Bps === 0 ? "none" : `${r.f3Bps / 100}%`
      }` +
      (r.level === 0
        ? " (no requirements)"
        : ` — requires ${r.needStake} USDT staked yourself, ${r.needVolume} USDT direct volume, ${r.needRefs} active referrals, ALL THREE`),
  ).join("\n");

  return `
PLANS (rate is decided by the recorded stake, not the deposit)
${plans}

ENTRY FEE (taken before the stake is recorded)
${fees}

CLAIM FEE
  10% of the yield claimed, halved to 5% on the Advanced and Elite plans.
  Charged on yield only, never on principal.

WHAT A CLAIM ACTUALLY PAYS — THE CLAIM FEE IS NOT THE ONLY DEDUCTION
  claim() pays: yield accrued, MINUS the claim fee, MINUS the upline's
  referral share. The referral share comes out of the CLAIMER'S OWN yield.
  It is not paid by the protocol on top.
  So if someone joined through a referral link, they receive between 8% and
  35% LESS of their yield than the claim fee alone suggests, depending on how
  many active uplines they have and what tier those uplines hold. With no
  referrer at all, there is no such deduction.
  Principal is never touched by this. Only yield.
  Never quote "yield minus claim fee" as what someone receives without saying
  the upline share also comes out, unless they have said they have no
  referrer. The connected dashboard shows their exact figure.

MINIMUM DEPOSIT
  The contract's minimum stake is 10 USDT measured AFTER the entry fee, so
  the smallest deposit that works is ${minGross.toFixed(2)} USDT. Sending
  exactly 10 is rejected. Maximum stake is 25,000 USDT.

EARLY EXIT (percentage of PRINCIPAL forfeited — NOT of yield)
${penalties}
  These come off the recorded stake itself. A 900 USDT position exited in
  week 1 returns 450 USDT. Unclaimed yield is lost on top, so claim first —
  but claiming does not reduce the penalty on the principal.
  Exit is open at all times, including while paused and for a blacklisted
  address. There is NO penalty-free withdrawal at the end of the term: yield
  stops accruing and exit still charges the week 5+ rate of 10%.

REFERRALS (three levels, deducted from the team member's claim, not their principal)
${tiers}

GOLD REWARDS — NOT THE SAME THING AS THE REFERRAL TIER CALLED "Gold"
  Two different things share the word and they must never be conflated.
    · The referral tier named Gold is in the REFERRALS list above and has
      the requirements stated there.
    · The gold rewards PROGRAMME pays physical gold, 1 gram up to 1
      kilogram, against team volume. Its thresholds and its round dates are
      STILL BEING SET. There are no figures for it. If asked what volume
      earns a gold bar, or when a round starts or ends, say the numbers are
      being finalised and point to /rewards. Never answer that question with
      a referral tier requirement — they are unrelated numbers.

ADDRESSES
  Staking contract: ${CONTRACT_ADDRESS}
  USDT to send (Polygon): ${COLLATERAL_ADDRESS}
  Network: Polygon mainnet, chain id 137. Gas is paid in POL.
  Source verified on Sourcify, exact match on creation and runtime bytecode.

LIVE ON-CHAIN${
    l
      ? `
  Total staked: ${l.totalStaked} USDT
  Contract USDT balance: ${l.contractBalance} USDT
  Paused: ${l.paused ? "YES" : "no"}
  Registered partners: ${l.partnerCount}. The voting body is the owner plus
  registered partners, and a rescue needs 3 votes plus a 48-hour delay.
  Emergency withdrawal open: ${l.emergencyOpen ? "YES" : "no"}${
    l.partnerCount < 3
      ? `
  IMPORTANT: fewer than 3 partners are registered, so the partner vote cannot
  currently reach quorum. If asked about emergency withdrawal, say plainly
  that the voting body is not yet in place.`
      : ""
  }`
      : `
  Unavailable — the chain read failed. Say so rather than guessing.`
  }

PAGES
  Home /  ·  Dashboard /dashboard  ·  Exchange and funding /get-usdt
  Gold rewards /rewards  ·  Security model /security  ·  Governance /partners
  Activity /activity  ·  Portfolio /portfolio  ·  Dobrna game (in development) /dobrna
  Telegram: https://t.me/arbhub_site — the ONLY support channel. There is no
  support email; any address claiming to be ours is an impersonator.
  Operating from Malaysia.
`.trim();
}

export const SYSTEM_RULES = `
You are the assistant on the ArbiSmart website. You help people understand
this one protocol and get started with it. Nothing else.

HARD RULES

1. Never state a number that is not in the FACTS block below. Not a rate, not
   a fee, not a threshold, not a date. If a number is not there, say you do
   not know and point to the page that would have it.

2. Never predict returns, prices or growth. Never say a return is guaranteed
   or safe. The rates are settings compiled into a contract, and you say it
   that way.

3. Never tell anyone how much to deposit, whether to deposit, or that this is
   a good investment. If asked, say that is their decision, and offer the
   facts that inform it.

4. No tax, legal or financial advice. Decline briefly and move on.

5. Never ask for a seed phrase, private key or password, and if a user
   mentions being asked for one by anybody, tell them clearly it is a scam
   and that ArbiSmart never asks.

6. Only these are ours: the site the user is on, and @arbhub_site on Telegram.
   Any other channel, group, admin DM or "support agent" is an impersonator.

7. Off-topic questions — other projects, coins, general crypto, anything not
   about ArbiSmart — get a one-line decline. Do not answer them.

STYLE

Answer in the same language the user wrote in. Be short: two or three
sentences for most questions. Give the relevant page path so they can check
you. Plain text only, no markdown formatting, no headings.

If something is unfavourable — a fee, a penalty, a limitation — say it
plainly. This project's whole argument is that it does not hide those, and an
assistant that softens them is working against it.
`.trim();

import abi from "./abi.json";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CONTRACT_ABI = abi;

export const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const COLLATERAL_ADDRESS = (process.env.NEXT_PUBLIC_COLLATERAL_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const EXPLORER = "https://polygonscan.com";

/**
 * Plan table, mirroring dailyRates / planDurations / minStakes in
 * ArbiSmartV2. The dashboard also reads these arrays on-chain, so a drift
 * between this table and the deployed contract shows up rather than hiding.
 */
export const PLANS = [
  { name: "Starter", minStake: 10, dailyBps: 120, durationDays: 180 },
  { name: "Growth", minStake: 500, dailyBps: 180, durationDays: 150 },
  { name: "Advanced", minStake: 2_500, dailyBps: 240, durationDays: 120 },
  { name: "Elite", minStake: 10_000, dailyBps: 300, durationDays: 90 },
] as const;

export const PLAN_NAMES = PLANS.map((p) => p.name);

/** Referral payout table, mirroring referralRates / f3Rates. */
export const REFERRAL_LEVELS = [
  { level: 0, name: "Base", f1Bps: 800, f2Bps: 400, f3Bps: 0, needRefs: 0, needStake: 0 },
  { level: 1, name: "Silver", f1Bps: 1200, f2Bps: 600, f3Bps: 200, needRefs: 5, needStake: 500 },
  { level: 2, name: "Gold", f1Bps: 1500, f2Bps: 800, f3Bps: 400, needRefs: 25, needStake: 2_500 },
  {
    level: 3,
    name: "Platinum",
    f1Bps: 2000,
    f2Bps: 1000,
    f3Bps: 500,
    needRefs: 100,
    needStake: 10_000,
  },
] as const;

/** Early-exit penalty schedule, mirroring PENALTY_W1..PENALTY_AF. */
export const PENALTY_SCHEDULE = [
  { label: "Week 1", bps: 5000 },
  { label: "Week 2", bps: 4000 },
  { label: "Week 3", bps: 3000 },
  { label: "Week 4", bps: 2000 },
  { label: "Week 5+", bps: 1000 },
] as const;

export const MIN_STAKE_UNITS = 10_000000n;
export const MAX_STAKE_UNITS = 25_000_000000n;

/**
 * The one deposit size the two development-fee wallets are allowed, mirroring
 * PROTOCOL_WALLET_STAKE. They are also barred from the free-stake window
 * outright — a free position for a wallet that collects protocol revenue would
 * be a claim on other depositors' capital with nothing behind it.
 */
export const PROTOCOL_WALLET_STAKE_UNITS = 1000_000000n;

/**
 * The deposit fee, mirroring DEVELOPMENT_FEE_BPS_1 + DEVELOPMENT_FEE_BPS_2.
 *
 * Both are immutable constructor parameters, so this cannot drift the way a
 * settable parameter could. It is used only for static marketing copy — every
 * figure a user actually transacts against comes from `quoteDeposit` on the
 * contract, never from this constant.
 */
export const DEPOSIT_FEE_BPS = 1000;

/**
 * The deposit needed for a given amount to survive the fee and be recorded.
 *
 * Plan tiers are decided by the *recorded* stake, so a depositor who sends
 * exactly a tier's minimum lands one tier below it. Rounding up matters: the
 * contract floors each fee share, and being a cent short of a threshold is
 * indistinguishable from being far short of it.
 */
export function grossForNet(net: number): number {
  return Math.ceil((net * 10000) / (10000 - DEPOSIT_FEE_BPS) * 100) / 100;
}

export function formatUnits6(value: bigint): string {
  const negative = value < 0n;
  const v = negative ? -value : value;
  const whole = v / 1_000000n;
  const frac = (v % 1_000000n).toString().padStart(6, "0").replace(/0+$/, "") || "0";
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

/** Compact display form: thousands separators, at most `decimals` decimals. */
export function formatAmount(value: bigint | undefined, decimals = 2): string {
  if (value === undefined || value === null) return "—";
  const negative = value < 0n;
  const v = negative ? -value : value;
  const num = Number(v / 1_000000n) + Number(v % 1_000000n) / 1_000_000;
  return `${negative ? "-" : ""}${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}`;
}

export function parseUnits6(value: string): bigint {
  const [whole, frac = ""] = value.trim().split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  const wholeBig = BigInt(whole === "" ? "0" : whole);
  return wholeBig * 1_000000n + BigInt(fracPadded === "" ? "0" : fracPadded);
}

export function formatBps(bps: number | bigint): string {
  const n = Number(bps);
  return `${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}%`;
}

export function shortAddress(address?: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Seconds remaining until `target`, a unix timestamp in seconds. */
export function secondsUntil(target: bigint | number | undefined): number {
  if (target === undefined) return 0;
  const t = Number(target);
  if (t === 0) return 0;
  return Math.max(0, t - Math.floor(Date.now() / 1000));
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Projected gross yield over a plan's full term, before the 10% claim fee. */
export function projectedYield(principal: number, planIndex: number): number {
  const plan = PLANS[planIndex];
  if (!plan) return 0;
  return (principal * plan.dailyBps * plan.durationDays) / 10000;
}

/** Mirrors _getPlanByAmount. */
export function planForAmount(amountUnits: bigint): number {
  if (amountUnits >= 10_000_000000n) return 3;
  if (amountUnits >= 2_500_000000n) return 2;
  if (amountUnits >= 500_000000n) return 1;
  return 0;
}

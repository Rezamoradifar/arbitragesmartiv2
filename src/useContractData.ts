import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider, formatUnits, isAddress } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS, POLYGON_RPC_URLS, USDT_ABI } from "./contract";

function getProvider() {
  return new JsonRpcProvider(POLYGON_RPC_URLS[0]);
}

export interface GlobalData {
  userCount: bigint;
  totalStaked: bigint;
  totalPaidOut: bigint;
  contractBalance: bigint;
  isFreePeriod: boolean;
  timeLeftSec: bigint;
  paused: boolean;
  emergencyMode: boolean;
  owner: string;
  feeWallet1: string;
  feeWallet2: string;
  usdtAddress: string;
  usdtSymbol: string;
  usdtDecimals: number;
  dailyRates: bigint[];
  planDurations: bigint[];
  minStakes: bigint[];
  referralRates: bigint[];
  f3Rates: bigint[];
  partners: string[];
  partnerCount: bigint;
  arbitrageAvailable: bigint;
  requiredVotes: bigint;
  emergencyVoteCount: bigint;
}

export interface UserData {
  address: string;
  stakeAmount: bigint;
  plan: bigint;
  rate: bigint;
  pendingReward: bigint;
  totalClaimed: bigint;
  refTotalEarned: bigint;
  refPendingReward: bigint;
  activeReferrals: bigint;
  active: boolean;
  freeStake: bool_;
  referrer: string;
  level: bigint;
  f1Volume: bigint;
  f2Volume: bigint;
  f1Count: bigint;
  claimCount: bigint;
  blacklisted: boolean;
}
type bool_ = boolean;

export function useGlobalData() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const provider = getProvider();
        const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        const [
          globalStats,
          freePeriod,
          timeLeft,
          paused,
          emergencyMode,
          owner,
          feeWallet1,
          feeWallet2,
          usdtAddress,
          partnersRes,
          arbitrageAvailable,
          requiredVotes,
          emergencyVoteCount,
        ] = await Promise.all([
          c.getGlobalStats(),
          c.isFreePeriod(),
          c.getTimeLeft(),
          c.paused(),
          c.emergencyMode(),
          c.OWNER(),
          c.FEE_WALLET_1(),
          c.FEE_WALLET_2(),
          c.USDT(),
          c.getPartners(),
          c.polymarketArbitrageAvailable(),
          c.REQUIRED_VOTES(),
          c.emergencyVoteCount(),
        ]);

        const dailyRates = await Promise.all([0, 1, 2, 3].map((i) => c.dailyRates(i)));
        const planDurations = await Promise.all([0, 1, 2, 3].map((i) => c.planDurations(i)));
        const minStakes = await Promise.all([0, 1, 2, 3].map((i) => c.minStakes(i)));
        const referralRates = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map((i) => c.referralRates(i)));
        const f3Rates = await Promise.all([0, 1, 2].map((i) => c.f3Rates(i)));

        let usdtSymbol = "USDT";
        let usdtDecimals = 6;
        try {
          const usdt = new Contract(usdtAddress, USDT_ABI, provider);
          const [sym, dec] = await Promise.all([usdt.symbol(), usdt.decimals()]);
          usdtSymbol = sym;
          usdtDecimals = Number(dec);
        } catch {
          // fall back to defaults if token metadata isn't readable
        }

        if (cancelled) return;
        setData({
          userCount: globalStats[0],
          totalStaked: globalStats[1],
          totalPaidOut: globalStats[2],
          contractBalance: globalStats[3],
          isFreePeriod: freePeriod,
          timeLeftSec: timeLeft,
          paused,
          emergencyMode,
          owner,
          feeWallet1,
          feeWallet2,
          usdtAddress,
          usdtSymbol,
          usdtDecimals,
          dailyRates,
          planDurations,
          minStakes,
          referralRates,
          f3Rates,
          partners: (partnersRes[0] as string[]).filter((p) => p !== "0x0000000000000000000000000000000000000000"),
          partnerCount: partnersRes[1],
          arbitrageAvailable,
          requiredVotes,
          emergencyVoteCount,
        });
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطا در خواندن قرارداد");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, error, loading };
}

export function useUserData(address: string | null) {
  const [data, setData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !isAddress(address)) {
      setData(null);
      setError(address ? "آدرس ولت معتبر نیست" : null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const provider = getProvider();
        const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const [userStats, extended, stakeBasic, refInfo, isBlacklisted, f1Count] = await Promise.all([
          c.getUserStats(address),
          c.getUserStatsExtended(address),
          c.getStakeBasic(address),
          c.getReferralInfo(address),
          c.blacklisted(address),
          c.getF1Count(address),
        ]);

        if (cancelled) return;
        setData({
          address: address as string,
          stakeAmount: userStats[0],
          plan: userStats[1],
          rate: userStats[2],
          pendingReward: userStats[3],
          totalClaimed: userStats[4],
          refTotalEarned: userStats[5],
          refPendingReward: userStats[6],
          activeReferrals: userStats[7],
          active: stakeBasic[4],
          freeStake: stakeBasic[5],
          referrer: refInfo[0],
          level: extended[1],
          f1Volume: extended[5],
          f2Volume: extended[6],
          f1Count,
          claimCount: extended[4],
          blacklisted: isBlacklisted,
        });
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطا در خواندن اطلاعات کاربر");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { data, error, loading };
}

export function fmtUsdt(v: bigint, decimals: number) {
  return Number(formatUnits(v, decimals)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtBps(v: bigint) {
  return (Number(v) / 100).toFixed(2) + "%";
}

export function fmtDuration(seconds: bigint) {
  const s = Number(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}س ${m}د ${sec}ث`;
}

export function shortAddr(a: string) {
  if (!a) return "-";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

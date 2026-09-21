"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  COLLATERAL_ADDRESS,
  ERC20_ABI,
  referralDeductionBps,
} from "./contract";

const base = { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI } as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function call(functionName: string, args: unknown[] = []) {
  return { ...base, functionName, args } as const;
}

/** Protocol-wide state: TVL, payouts, arbitrage capital, pause/emergency flags. */
export function useProtocol() {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      call("getGlobalStats"),
      call("totalAssets"),
      call("totalArbitrageDeployed"),
      call("totalArbitrageProfit"),
      call("polymarketArbitrageAvailable"),
      call("arbitrageDeploymentCeiling"),
      call("paused"),
      call("emergencyMode"),
      call("isFreePeriod"),
      call("getTimeLeft"),
      call("owner"),
      call("profitFeeBPS"),
      // --- V4 ---
      call("dashboard"),
      call("freeStakeCount"),
      call("MAX_FREE_STAKES"),
      call("MIN_ACTIVATION_DEPOSIT"),
      call("totalGranted"),
      call("arbitrageTokenBalance"),
      call("totalGrossDeposits"),
    ],
    query: { refetchInterval: 15_000 },
  });

  const stats = data?.[0]?.result as readonly [bigint, bigint, bigint, bigint] | undefined;
  // dashboard() returns the whole balance sheet in one call, which is what
  // keeps pool capital and platform revenue visibly separate in the UI.
  const sheet = data?.[12]?.result as
    | readonly [bigint, bigint, bigint, bigint, bigint, bigint]
    | undefined;


  return {
    isLoading,
    refetch,
    userCount: stats?.[0],
    totalStaked: stats?.[1],
    totalPaidOut: stats?.[2],
    balance: stats?.[3],
    totalAssets: data?.[1]?.result as bigint | undefined,
    arbitrageDeployed: data?.[2]?.result as bigint | undefined,
    arbitrageProfit: data?.[3]?.result as bigint | undefined,
    arbitrageAvailable: data?.[4]?.result as bigint | undefined,
    arbitrageCeiling: data?.[5]?.result as bigint | undefined,
    paused: data?.[6]?.result as boolean | undefined,
    emergencyMode: data?.[7]?.result as boolean | undefined,
    isFreePeriod: data?.[8]?.result as boolean | undefined,
    freeTimeLeft: data?.[9]?.result as bigint | undefined,
    owner: data?.[10]?.result as `0x${string}` | undefined,
    profitFeeBps: data?.[11]?.result as bigint | undefined,

    // --- V4 balance sheet ---
    grossDeposits: sheet?.[0],
    developmentFees: sheet?.[1],
    userNetStakes: sheet?.[2],
    mainPoolBalance: sheet?.[3],
    developmentFeeBalance: sheet?.[4],
    deployedToArbitrage: sheet?.[5],
    freeStakeCount: data?.[13]?.result as bigint | undefined,
    maxFreeStakes: data?.[14]?.result as bigint | undefined,
    /** Real collateral a giveaway position must deposit before it can claim. */
    minActivationDeposit: data?.[15]?.result as bigint | undefined,
    totalGranted: data?.[16]?.result as bigint | undefined,
    arbitrageTokenBalance: data?.[17]?.result as bigint | undefined,
    totalGrossDeposits: data?.[18]?.result as bigint | undefined,
  };
}

/**
 * The exact split the contract will apply to a deposit, read from the contract
 * rather than recomputed here.
 *
 * The deposit fee is only honest if the depositor sees it before signing, and
 * a number derived in the browser is a number that can drift from the one the
 * contract actually uses. `quoteDeposit` is a view on the same arithmetic the
 * transaction runs, so what is shown and what is charged cannot disagree.
 */
export function useDepositQuote(grossAmount: bigint) {
  const enabled = grossAmount > 0n;

  const { data, isLoading } = useReadContracts({
    contracts: [
      call("quoteDeposit", [grossAmount]),
      // V4's fee is a band chosen by deposit size, not a single constant, so
      // the rate that applied has to be read for this amount specifically.
      call("depositFeeBps", [grossAmount]),
    ],
    query: { enabled },
  });

  const q = data?.[0]?.result as readonly [bigint, bigint, bigint, bigint] | undefined;

  return {
    isLoading,
    fee1: q?.[0],
    fee2: q?.[1],
    totalFee: q?.[2],
    /** What actually gets recorded as the user's stake. */
    netStake: q?.[3],
    /** The band that applied to THIS amount, in basis points. */
    feeBps: data?.[1]?.result as bigint | undefined,
  };
}

/** The claim fee for a plan, which V4 halves for the two upper tiers. */
export function useClaimFeeBps(plan: number | undefined) {
  const { data } = useReadContract({
    ...base,
    functionName: "claimFeeBps",
    args: [BigInt(plan ?? 0)],
    query: { enabled: plan !== undefined },
  });
  return data as bigint | undefined;
}

/** Second- and third-level downlines by address, which V3 could not report. */
export function useDownline() {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [call("getF2List", [address]), call("getF3List", [address])],
    query: { enabled: Boolean(address), refetchInterval: 30_000 },
  });
  return {
    isLoading,
    refetch,
    f2: (data?.[0]?.result as readonly `0x${string}`[] | undefined) ?? [],
    f3: (data?.[1]?.result as readonly `0x${string}`[] | undefined) ?? [],
  };
}

/** The connected wallet's stake, rewards, referral standing and allowance. */
export function useUserPosition() {
  const { address } = useAccount();
  const enabled = Boolean(address);
  const holder = address ?? ZERO_ADDRESS;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      call("getStakeBasic", [address]),
      call("getReward", [address]),
      call("getReferralInfo", [address]),
      call("getTeamVolume", [address]),
      call("getUserStatsExtended", [address]),
      call("emergencyWithdrawOpen"),
      call("blacklisted", [address]),
      // The ERC20 entries are typed strictly, unlike call(), so they need a
      // concrete address. `enabled` keeps these from running while the wallet
      // is disconnected, so the placeholder is never actually queried.
      { address: COLLATERAL_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [holder] },
      {
        address: COLLATERAL_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [holder, CONTRACT_ADDRESS],
      },
      // --- V4 ---
      call("userDepositBreakdown", [address]),
      call("isProtocolWallet", [address]),
    ],
    query: { enabled, refetchInterval: 15_000 },
  });

  const stake = data?.[0]?.result as
    | readonly [bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint]
    | undefined;
  const ref = data?.[2]?.result as readonly [`0x${string}`, bigint, bigint, bigint, bigint] | undefined;
  const team = data?.[3]?.result as readonly [bigint, bigint, bigint] | undefined;
  const deposit = data?.[9]?.result as readonly [bigint, bigint, bigint, bigint] | undefined;

  return {
    address,
    isLoading,
    refetch,
    amount: stake?.[0],
    plan: stake?.[1],
    rate: stake?.[2],
    startTime: stake?.[3],
    active: stake?.[4],
    freeStake: stake?.[5],
    totalClaimed: stake?.[6],
    claimCount: stake?.[7],
    pendingReward: data?.[1]?.result as bigint | undefined,
    referrer: ref?.[0],
    refTotalEarned: ref?.[1],
    refPending: ref?.[2],
    activeReferrals: ref?.[3],
    level: ref?.[4],
    f1Volume: team?.[0],
    f2Volume: team?.[1],
    teamVolume: team?.[2],
    emergencyOpen: data?.[5]?.result as boolean | undefined,
    blacklisted: data?.[6]?.result as boolean | undefined,
    walletBalance: data?.[7]?.result as bigint | undefined,
    allowance: data?.[8]?.result as bigint | undefined,

    // --- V4 --- lifetime deposit accounting, so a user can always reconcile
    // what they sent against what was recorded.
    grossDeposited: deposit?.[0],
    platformFeePaid: deposit?.[1],
    netStaked: deposit?.[2],
    isProtocolWallet: data?.[10]?.result as boolean | undefined,
  };
}

/** Partner registry, emergency vote tally and rescue state. */
export function useGovernance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      call("getVoters"),
      call("partnerCount"),
      call("emergencyVoteCount"),
      call("emergencyMode"),
      call("emergencyActivatedAt"),
      call("EMERGENCY_DELAY"),
      call("REQUIRED_VOTES"),
      call("MAX_PARTNERS"),
      call("rescueVoteCount"),
      call("rescueInitiatedAt"),
      call("rescueExecutableAt"),
      call("rescueReady"),
      call("recoveryWallet"),
      call("RESCUE_DELAY"),
      call("owner"),
      call("emergencyWithdrawOpen"),
    ],
    query: { refetchInterval: 12_000 },
  });

  const myVotes = useReadContracts({
    contracts: [call("emergencyVotes", [address]), call("rescueVotes", [address])],
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  const voters = (data?.[0]?.result as readonly `0x${string}`[] | undefined) ?? [];
  const owner = data?.[14]?.result as `0x${string}` | undefined;

  return {
    isLoading,
    refetch: () => {
      refetch();
      myVotes.refetch();
    },
    voters,
    partnerCount: data?.[1]?.result as bigint | undefined,
    emergencyVoteCount: data?.[2]?.result as bigint | undefined,
    emergencyMode: data?.[3]?.result as boolean | undefined,
    emergencyActivatedAt: data?.[4]?.result as bigint | undefined,
    emergencyDelay: data?.[5]?.result as bigint | undefined,
    requiredVotes: data?.[6]?.result as bigint | undefined,
    maxPartners: data?.[7]?.result as bigint | undefined,
    rescueVoteCount: data?.[8]?.result as bigint | undefined,
    rescueInitiatedAt: data?.[9]?.result as bigint | undefined,
    rescueExecutableAt: data?.[10]?.result as bigint | undefined,
    rescueReady: data?.[11]?.result as boolean | undefined,
    recoveryWallet: data?.[12]?.result as `0x${string}` | undefined,
    rescueDelay: data?.[13]?.result as bigint | undefined,
    owner,
    emergencyWithdrawOpen: data?.[15]?.result as boolean | undefined,
    isOwner: Boolean(address && owner && address.toLowerCase() === owner.toLowerCase()),
    isVoter: Boolean(address && voters.some((v) => v.toLowerCase() === address.toLowerCase())),
    hasVotedEmergency: myVotes.data?.[0]?.result as boolean | undefined,
    hasVotedRescue: myVotes.data?.[1]?.result as boolean | undefined,
  };
}

/** The connected wallet's direct (F1) referrals. */
export function useReferralTree() {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    ...base,
    functionName: "getF1List",
    args: [address],
    query: { enabled: Boolean(address), refetchInterval: 30_000 },
  });

  const result = data as readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[]] | undefined;

  return {
    isLoading,
    refetch,
    referrals: (result?.[0] ?? []).map((addr, i) => ({
      address: addr,
      amount: result?.[1]?.[i] ?? 0n,
      plan: Number(result?.[2]?.[i] ?? 0n),
    })),
  };
}

/**
 * The exact share of the connected wallet's next claim that leaves for its
 * upline.
 *
 * Worth three round trips because it is the difference between what the
 * dashboard promises and what the wallet receives. `claim()` subtracts the
 * upline share from the claimer's own yield, so a card showing only the claim
 * fee is wrong for anybody who arrived through a referral link — which is most
 * people here.
 *
 * The chain is walked one level at a time because each referrer's address is
 * only known once the level below has been read. The contract skips an
 * inactive or blacklisted upline WITHOUT breaking the chain, so a skipped
 * level is recorded as `null` and the walk continues past it — dropping it
 * would shift the level above into a higher-paying depth.
 */
type UplineRead = { data?: readonly { result?: unknown }[]; isLoading: boolean };

function uplineOf(r: UplineRead) {
  const ref = r.data?.[0]?.result as
    | readonly [`0x${string}`, bigint, bigint, bigint, bigint]
    | undefined;
  const stake = r.data?.[1]?.result as
    | readonly [bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint]
    | undefined;
  const banned = r.data?.[2]?.result as boolean | undefined;
  const referrer = ref?.[0];
  return {
    referrer: referrer && referrer !== ZERO_ADDRESS ? referrer : undefined,
    // A level the contract would skip still occupies its depth.
    level: stake?.[4] && !banned ? Number(ref?.[4] ?? 0n) : null,
    loading: r.isLoading,
  };
}

function uplineQuery(holder: `0x${string}` | undefined) {
  return {
    contracts: [
      call("getReferralInfo", [holder]),
      call("getStakeBasic", [holder]),
      call("blacklisted", [holder]),
    ],
    query: { enabled: Boolean(holder), refetchInterval: 60_000 },
  } as const;
}

export function useUplineDeduction() {
  const { address } = useAccount();

  // Three fixed hook calls in a fixed order — the addresses change, the number
  // of hooks never does.
  const selfRead = useReadContracts(uplineQuery(address));
  const self = uplineOf(selfRead);
  const up1Read = useReadContracts(uplineQuery(self.referrer));
  const up1 = uplineOf(up1Read);
  const up2Read = useReadContracts(uplineQuery(up1.referrer));
  const up2 = uplineOf(up2Read);

  // The tier that prices depth 0 is the direct referrer's own tier, which is
  // read AT that referrer — one step behind the walk.
  const levels: (number | null)[] = [];
  if (self.referrer) levels.push(up1.level);
  if (up1.referrer) levels.push(up2.level);
  // The third depth would need a fourth hop. Rather than assume it is empty,
  // it is priced at the Platinum ceiling when the chain is known to reach that
  // far: overstating the deduction understates the payout, which is the safe
  // direction to be wrong in.
  if (up2.referrer) levels.push(3);

  return {
    hasUpline: Boolean(self.referrer),
    bps: referralDeductionBps(levels),
    isLoading: self.loading || up1.loading || up2.loading,
  };
}

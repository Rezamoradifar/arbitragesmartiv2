"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS, COLLATERAL_ADDRESS, ERC20_ABI } from "./contract";

const base = { address: CONTRACT_ADDRESS, abi: CONTRACT_ABI } as const;

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
      // --- V3 ---
      call("dashboard"),
      call("DEVELOPMENT_FEE_BPS_1"),
      call("DEVELOPMENT_FEE_BPS_2"),
      call("freeStakeCount"),
      call("MAX_FREE_STAKES"),
      call("migrationOpen"),
      call("totalMigrated"),
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

  const feeBps1 = data?.[13]?.result as bigint | undefined;
  const feeBps2 = data?.[14]?.result as bigint | undefined;

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

    // --- V3 ---
    grossDeposits: sheet?.[0],
    developmentFees: sheet?.[1],
    userNetStakes: sheet?.[2],
    mainPoolBalance: sheet?.[3],
    developmentFeeBalance: sheet?.[4],
    deployedToArbitrage: sheet?.[5],
    devFeeBps1: feeBps1,
    devFeeBps2: feeBps2,
    devFeeBpsTotal: feeBps1 !== undefined && feeBps2 !== undefined ? feeBps1 + feeBps2 : undefined,
    freeStakeCount: data?.[15]?.result as bigint | undefined,
    maxFreeStakes: data?.[16]?.result as bigint | undefined,
    migrationOpen: data?.[17]?.result as boolean | undefined,
    totalMigrated: data?.[18]?.result as bigint | undefined,
    totalGranted: data?.[19]?.result as bigint | undefined,
    arbitrageTokenBalance: data?.[20]?.result as bigint | undefined,
    totalGrossDeposits: data?.[21]?.result as bigint | undefined,
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
  const { data, isLoading } = useReadContract({
    ...base,
    functionName: "quoteDeposit",
    args: [grossAmount],
    query: { enabled: grossAmount > 0n },
  });

  const q = data as readonly [bigint, bigint, bigint, bigint] | undefined;

  return {
    isLoading,
    fee1: q?.[0],
    fee2: q?.[1],
    totalFee: q?.[2],
    /** What actually gets recorded as the user's stake. */
    netStake: q?.[3],
  };
}

/** The connected wallet's stake, rewards, referral standing and allowance. */
export function useUserPosition() {
  const { address } = useAccount();
  const enabled = Boolean(address);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      call("getStakeBasic", [address]),
      call("getReward", [address]),
      call("getReferralInfo", [address]),
      call("getTeamVolume", [address]),
      call("getUserStatsExtended", [address]),
      call("emergencyWithdrawOpen"),
      call("blacklisted", [address]),
      { address: COLLATERAL_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      {
        address: COLLATERAL_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACT_ADDRESS],
      },
      // --- V3 ---
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

    // --- V3 --- lifetime deposit accounting, so a user can always reconcile
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

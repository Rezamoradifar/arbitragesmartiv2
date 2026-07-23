export const CONTRACT_ADDRESS = "0xdE8859444957B327F18f75E2C600d6Cc275Ea662";

export const POLYGON_CHAIN_ID = 137;
export const POLYGON_RPC_URLS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com",
];
export const POLYGONSCAN_URL = `https://polygonscan.com/address/${CONTRACT_ADDRESS}`;

export const CONTRACT_ABI = [
  { inputs: [{ internalType: "address", name: "_usdt", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "FEE_WALLET_1", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FEE_WALLET_2", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "FREE_PERIOD", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MAX_PARTNERS", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "OWNER", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "REQUIRED_VOTES", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "USDT", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "blacklisted", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "dailyRates", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "dailyWithdrawn", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "deployTime", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "emergencyMode", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "emergencyVoteCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "emergencyVotes", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "f3Rates", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getBalance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getClaimCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getF1Count", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getF1List", outputs: [{ internalType: "address[]", name: "", type: "address[]" }, { internalType: "uint256[]", name: "", type: "uint256[]" }, { internalType: "uint256[]", name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getGlobalStats", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getPartners", outputs: [{ internalType: "address[4]", name: "", type: "address[4]" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getRefReward", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getReferralInfo", outputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getReward", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getStakeBasic", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "bool", name: "", type: "bool" }, { internalType: "bool", name: "", type: "bool" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getTeamVolume", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getTimeLeft", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getUserStats", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "u", type: "address" }], name: "getUserStatsExtended", outputs: [{ internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "bool", name: "", type: "bool" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }, { internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isFreePeriod", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "lastWithdrawalDay", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "minStakes", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "partnerCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "partners", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "planDurations", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "polymarketArbitrageAvailable", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "", type: "uint256" }], name: "referralRates", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "referrals", outputs: [{ internalType: "address", name: "referrer", type: "address" }, { internalType: "uint256", name: "totalEarned", type: "uint256" }, { internalType: "uint256", name: "pendingReward", type: "uint256" }, { internalType: "uint256", name: "activeReferrals", type: "uint256" }, { internalType: "uint256", name: "level", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "", type: "address" }], name: "stakes", outputs: [{ internalType: "uint256", name: "amount", type: "uint256" }, { internalType: "uint256", name: "plan", type: "uint256" }, { internalType: "uint256", name: "rate", type: "uint256" }, { internalType: "uint256", name: "startTime", type: "uint256" }, { internalType: "uint256", name: "lastClaimTime", type: "uint256" }, { internalType: "uint256", name: "totalClaimed", type: "uint256" }, { internalType: "bool", name: "active", type: "bool" }, { internalType: "bool", name: "earlyExited", type: "bool" }, { internalType: "bool", name: "freeStake", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalPaidOut", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalStaked", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const USDT_ABI = [
  { inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
] as const;

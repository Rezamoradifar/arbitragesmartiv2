/**
 * Deploys a Gnosis Safe on Polygon to serve as the contract's recoveryWallet.
 *
 *   node frontend/scripts/deploy-recovery-safe.mjs 0xOwnerA 0xOwnerB [threshold]
 *
 * Paying the gas does not grant any control: a Safe's owners are fixed by the
 * setup call encoded below, and the deployer key appears nowhere in it. Run it
 * with --dry-run first to see the predicted address and the exact owner set
 * before anything is broadcast.
 *
 * Why this address matters more than any other in the system: executeRescue()
 * transfers the ENTIRE collateral balance of the staking contract here in one
 * call. It is the only address that can ever receive staker principal in bulk.
 */

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  isAddress,
} from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const RPC = process.env.POLYGON_RPC_URL || "https://polygon.gateway.tenderly.co";

// Canonical Safe v1.4.1 deployments. Verified present on Polygon before use —
// a typo here would send the setup call into nothing and burn the gas.
const PROXY_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";

/*
 * SafeL2, not Safe.
 *
 * The two are the same wallet logic; SafeL2 additionally emits an event for
 * every execution. Safe's own transaction service reconstructs a Safe's
 * history from those events on every chain except Ethereum mainnet, so an L1
 * singleton deployed to Polygon produces a wallet that holds funds correctly
 * but that app.safe.global flags as an unsupported version and cannot follow.
 * A recovery wallet is used exactly once, under pressure, by people who did
 * not set it up — it has to work in the official interface.
 */
const SINGLETON = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
const FALLBACK_HANDLER = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";
const ZERO = "0x0000000000000000000000000000000000000000";

/** The wallet that owns the staking contract. Barred as a Safe signer: the
 *  recovery path exists for the case where this key is the compromised one. */
const STAKING_OWNER = "0x0C52DDb2F4147A4FD8A749F988Ab41A6E201669A";

const factoryAbi = [
  {
    type: "function",
    name: "createProxyWithNonce",
    inputs: [
      { name: "_singleton", type: "address" },
      { name: "initializer", type: "bytes" },
      { name: "saltNonce", type: "uint256" },
    ],
    outputs: [{ name: "proxy", type: "address" }],
    stateMutability: "nonpayable",
  },
];

const safeAbi = [
  {
    type: "function",
    name: "setup",
    inputs: [
      { name: "_owners", type: "address[]" },
      { name: "_threshold", type: "uint256" },
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
      { name: "fallbackHandler", type: "address" },
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "paymentReceiver", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "getOwners", inputs: [], outputs: [{ type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getThreshold", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
];

function loadDeployer() {
  for (const p of [resolve(HERE, "../../.env"), resolve(HERE, "../.env.local")]) {
    try {
      const m = readFileSync(p, "utf8").match(/^PRIVATE_KEY\s*=\s*(0x)?([0-9a-fA-F]{64})/m);
      if (m) return privateKeyToAccount(`0x${m[2]}`);
    } catch {
      /* try the next location */
    }
  }
  throw new Error("No PRIVATE_KEY found in .env");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((a) => !a.startsWith("--"));

  const owners = [];
  for (const raw of positional) {
    if (!isAddress(raw, { strict: false })) break;
    owners.push(getAddress(raw));
  }
  const thresholdArg = positional[owners.length];
  const threshold = thresholdArg ? Number(thresholdArg) : owners.length;

  // --- refuse to build something unsafe ------------------------------------
  if (owners.length < 2) throw new Error("Give at least two owner addresses.");
  if (new Set(owners.map((o) => o.toLowerCase())).size !== owners.length) {
    throw new Error("Duplicate owner address — that would silently weaken the threshold.");
  }
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > owners.length) {
    throw new Error(`Threshold must be between 1 and ${owners.length}.`);
  }
  if (threshold === 1) {
    throw new Error("Threshold 1 means any single key can move everything. Refusing.");
  }
  const clash = owners.find((o) => o.toLowerCase() === STAKING_OWNER.toLowerCase());
  if (clash) {
    throw new Error(
      `${clash} owns the staking contract. If that key is ever stolen the thief would already hold one of the signatures needed to drain the recovery Safe. Use a different address.`,
    );
  }

  const publicClient = createPublicClient({ chain: polygon, transport: http(RPC) });
  const deployer = loadDeployer();

  // A signer with no history is a signer nobody can prove they still control.
  for (const o of owners) {
    const [bal, nonce, code] = await Promise.all([
      publicClient.getBalance({ address: o }),
      publicClient.getTransactionCount({ address: o }),
      publicClient.getCode({ address: o }),
    ]);
    const kind = code && code !== "0x" ? "CONTRACT" : "EOA";
    console.log(`  owner ${o}  ${kind}  ${formatEther(bal)} POL  ${nonce} txs`);
    if (kind === "EOA" && nonce === 0) {
      console.log("        ^ never sent a transaction. Send one POL to it and move it back before");
      console.log("          relying on this key — an address you cannot sign with is not a signer.");
    }
  }

  const initializer = encodeFunctionData({
    abi: safeAbi,
    functionName: "setup",
    args: [owners, BigInt(threshold), ZERO, "0x", FALLBACK_HANDLER, ZERO, 0n, ZERO],
  });

  // Deterministic, so a re-run after a dropped transaction reuses the address
  // rather than quietly deploying a second Safe.
  const saltNonce = BigInt(process.env.SAFE_SALT || "20260811");

  const predicted = await publicClient.readContract({
    address: PROXY_FACTORY,
    abi: factoryAbi,
    functionName: "createProxyWithNonce",
    args: [SINGLETON, initializer, saltNonce],
    account: deployer.address,
  });

  console.log("\n=== PLAN ===");
  console.log("  owners          ", owners.join("\n                   "));
  console.log("  threshold       ", `${threshold} of ${owners.length}`);
  console.log("  salt            ", saltNonce.toString());
  console.log("  paying gas from ", deployer.address, `(${formatEther(await publicClient.getBalance({ address: deployer.address }))} POL)`);
  console.log("  Safe address    ", predicted);

  if (dryRun) {
    console.log("\n--dry-run: nothing was broadcast.");
    return;
  }

  const wallet = createWalletClient({ account: deployer, chain: polygon, transport: http(RPC) });
  const hash = await wallet.writeContract({
    address: PROXY_FACTORY,
    abi: factoryAbi,
    functionName: "createProxyWithNonce",
    args: [SINGLETON, initializer, saltNonce],
  });
  console.log("\n  tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("  status:", receipt.status, "block", receipt.blockNumber);

  // Read the deployed Safe back rather than trusting the prediction.
  const [onchainOwners, onchainThreshold] = await Promise.all([
    publicClient.readContract({ address: predicted, abi: safeAbi, functionName: "getOwners" }),
    publicClient.readContract({ address: predicted, abi: safeAbi, functionName: "getThreshold" }),
  ]);
  console.log("\n=== DEPLOYED AND VERIFIED ON-CHAIN ===");
  console.log("  Safe      ", predicted);
  console.log("  owners    ", onchainOwners.join(", "));
  console.log("  threshold ", onchainThreshold.toString());
  console.log("  explorer   https://polygonscan.com/address/" + predicted);
  console.log("  app        https://app.safe.global/home?safe=matic:" + predicted);
}

main().catch((e) => {
  console.error("\nFAILED:", e.shortMessage || e.message);
  process.exit(1);
});

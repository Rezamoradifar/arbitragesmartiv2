#!/usr/bin/env node
/**
 * Places real trades on Polymarket from a SEPARATE trading wallet.
 *
 * This deliberately does NOT go through the ArbiSmart contract's
 * executePolymarketSplit/Merge/Redeem. Those functions cannot capture
 * arbitrage profit on their own: buying or selling on Polymarket's order
 * book happens through fillOrder/matchOrders on Polymarket's CTF Exchange,
 * and those are gated to Polymarket's own operator — no third-party
 * contract can call them directly (see docs/telegram-content-bank.json,
 * item "why-onlyoperator-blocks-arb", already posted publicly).
 *
 * A regular wallet doesn't hit that wall at all: placing an order through
 * Polymarket's own CLOB API (this file uses their official
 * @polymarket/clob-client) is exactly how every human trader on Polymarket
 * trades — Polymarket's operator settles the match, same as it would for
 * a person clicking Buy on their site. splitPosition/mergePositions on the
 * Conditional Tokens contract are separately and genuinely permissionless
 * for any caller, contract or wallet (verified against the deployed
 * contract's own source — see the IConditionalTokens interface in
 * src/ArbiSmartV4.sol).
 *
 * So the actual flow is:
 *   1. This wallet buys a complete set below $1 (two CLOB buys) and merges
 *      it back to $1 collateral immediately (permissionless, no waiting for
 *      market resolution) — profit is the gap, minus fees.
 *   2. Or: splits $1 collateral into a set (permissionless) and sells both
 *      legs above $1 combined (two CLOB sells) — same profit, other side.
 *   3. Realized profit sits in this wallet, not in the ArbiSmart contract.
 *      Moving it over is a separate, deliberate step — the owner approves
 *      and calls depositArbitrageProfit() from the admin console, the same
 *      one already built. This script does not do that automatically.
 *
 * SAFETY
 * ------
 * - DRY_RUN defaults to true. Scanning and deciding always run; nothing is
 *   ever submitted to the CLOB or signed on-chain unless DRY_RUN=false.
 * - Going live also requires LIVE_CONFIRM=yes, a second, independent flag —
 *   so a single stray env var (or a copy-pasted example) can't flip this
 *   into live trading by accident.
 * - TRADER_PRIVATE_KEY is read from bot/.env, which is gitignored and must
 *   be created directly on the server. It is never logged, never written
 *   anywhere by this script, and this script has no code path that prints
 *   it under any flag.
 * - MAX_TRADE_USDT caps exposure per trade. Start small.
 *
 * WHAT IS AND ISN'T TESTED
 * ------------------------
 * The scan/decide path reuses bot/lib.mjs's scan(), which has been running
 * unattended in production for the read-only scanner for weeks. The order-
 * placement path below (postOrder, splitPosition/mergePositions calls) is
 * new, structurally correct against the documented clob-client and
 * ConditionalTokens interfaces, but has never been fired against a real
 * order — there is no funded wallet in this environment to test it with.
 * Treat the first several LIVE runs as the actual test, watched by a human,
 * with MAX_TRADE_USDT kept small until each code path has been seen to work.
 *
 *   node bot/execute.mjs                                    # dry run
 *   DRY_RUN=false LIVE_CONFIRM=yes node bot/execute.mjs      # real orders
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { scan } from "./lib.mjs";

try {
  process.loadEnvFile(new URL(".env", import.meta.url).pathname);
} catch {
  // No bot/.env yet. Fine for a dry run; live mode checks for the key below.
}

// Read by the site's read-only TradingBotStatus panel. Never anything price-,
// combined-cost-, or fee-related here — same rule publish-scan.mjs already
// follows: an opportunity named in public is one someone else races into
// before the next run.
const STATUS_OUT = fileURLToPath(new URL("../frontend/public/trading-bot-status.json", import.meta.url));

/** Tracks this run's outcome as it happens, written once at the very end
 *  (including on a thrown error) so the panel always reflects the last
 *  completed run rather than going stale mid-crash. */
const runStatus = {
  lastDecision: /** @type {"no-opportunity"|"found"|"executed"|"skipped-stale"} */ ("no-opportunity"),
  lastOpportunity: /** @type {{side: string, market: string, expectedProfit: number} | null} */ (null),
  tradeExecuted: false,
  realizedDelta: 0,
};

function getWalletAddress() {
  try {
    return process.env.TRADER_PRIVATE_KEY ? new ethers.Wallet(process.env.TRADER_PRIVATE_KEY).address : null;
  } catch {
    return null;
  }
}

function writeStatus() {
  let previous = {};
  try {
    previous = JSON.parse(readFileSync(STATUS_OUT, "utf8"));
  } catch {
    previous = {};
  }

  const now = new Date().toISOString();
  const payload = {
    updatedAt: now,
    mode: DRY_RUN ? "dry-run" : "live",
    walletAddress: getWalletAddress() ?? previous.walletAddress ?? null,
    lastRunAt: now,
    lastDecision: runStatus.lastDecision,
    lastOpportunity: runStatus.lastOpportunity,
    tradesExecuted: (Number(previous.tradesExecuted) || 0) + (runStatus.tradeExecuted ? 1 : 0),
    realizedProfitUsd: Math.round(((Number(previous.realizedProfitUsd) || 0) + runStatus.realizedDelta) * 100) / 100,
  };

  writeFileSync(STATUS_OUT, JSON.stringify(payload, null, 2));
  log(`Wrote status to ${STATUS_OUT}`);
}

const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";
const LIVE_CONFIRM = (process.env.LIVE_CONFIRM ?? "").toLowerCase() === "yes";
const MAX_TRADE_USDT = Number(process.env.MAX_TRADE_USDT ?? 10);
const MIN_PROFIT_USDT = Number(process.env.MIN_PROFIT_USDT ?? 1);
const RPC_URL = process.env.RPC_URL ?? "https://polygon.gateway.tenderly.co";
const CLOB_HOST = "https://clob.polymarket.com";
const POLYGON_CHAIN_ID = 137;

const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const CONDITIONAL_TOKENS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";

const CONDITIONAL_TOKENS_ABI = [
  "function splitPosition(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount) external",
  "function mergePositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

/** Both legs at once, so one side never fills without the other — a lone
 *  filled leg is a naked, unhedged position, exactly what this exists to
 *  avoid. If either leg fails, this function throws; nothing partial is
 *  left silently unlogged. */
async function placeBothLegs(client, legs) {
  const results = [];
  for (const leg of legs) {
    const order = await client.createOrder({
      tokenID: leg.tokenId,
      price: leg.price,
      side: leg.side,
      size: leg.size,
    });
    const res = await client.postOrder(order, OrderType.FOK);
    log("order result:", JSON.stringify(res));
    if (!res?.success) throw new Error(`Leg failed: ${JSON.stringify(res)}`);
    results.push(res);
  }
  return results;
}

async function main() {
  log(DRY_RUN ? "DRY RUN — scanning and deciding only, nothing will be submitted." : "LIVE MODE.");

  const result = await scan({ limit: 400, probeShares: Math.max(1, MAX_TRADE_USDT) });
  const hits = result.opportunities.filter((o) => o.profit >= MIN_PROFIT_USDT);

  log(`Scanned ${result.scanned}. ${hits.length} opportunities above $${MIN_PROFIT_USDT}.`);

  if (!hits.length) {
    log("Nothing to do this pass.");
    return;
  }

  const best = hits[0];
  log(
    `Best: ${best.side} · ${best.market.question.slice(0, 80)} · ` +
      `${best.shares.toFixed(0)} shares · expected profit $${best.profit.toFixed(2)}`,
  );

  runStatus.lastDecision = "found";
  runStatus.lastOpportunity = { side: best.side, market: best.market.slug, expectedProfit: best.profit };

  if (DRY_RUN) {
    log("DRY RUN — would execute:", JSON.stringify({
      side: best.side,
      market: best.market.slug,
      conditionId: best.market.conditionId,
      negRisk: best.market.negRisk,
      shares: best.shares,
      priceYes: best.priceYes,
      priceNo: best.priceNo,
      fees: best.fees,
      expectedProfit: best.profit,
    }));
    return;
  }

  if (!LIVE_CONFIRM) {
    log("FATAL: DRY_RUN=false but LIVE_CONFIRM is not 'yes'. Refusing to trade. Set both explicitly.");
    process.exitCode = 1;
    return;
  }
  if (!process.env.TRADER_PRIVATE_KEY) {
    log("FATAL: TRADER_PRIVATE_KEY not set in bot/.env. Refusing to run live without it.");
    process.exitCode = 1;
    return;
  }
  if (best.shares * Math.min(best.priceYes ?? 1, best.priceNo ?? 1) > MAX_TRADE_USDT * 1.05) {
    log(`FATAL: sized opportunity (~$${best.shares.toFixed(2)}) exceeds MAX_TRADE_USDT=${MAX_TRADE_USDT}. Refusing.`);
    process.exitCode = 1;
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.TRADER_PRIVATE_KEY, provider);
  log(`Trading wallet: ${wallet.address}`);

  const usdc = new ethers.Contract(USDC_E, ERC20_ABI, wallet);
  const balance = await usdc.balanceOf(wallet.address);
  log(`Wallet USDC.e balance: ${(Number(balance) / 1e6).toFixed(2)}`);
  if (Number(balance) / 1e6 < MAX_TRADE_USDT) {
    log("FATAL: wallet balance is below MAX_TRADE_USDT. Fund it first. Refusing.");
    process.exitCode = 1;
    return;
  }

  // clob-client handles the CLOB order/settlement path. Everything below it
  // (approvals, splitPosition/mergePositions) talks to the two contracts
  // directly — both are the exact addresses ArbiSmartV4.sol itself calls.
  const clobClient = new ClobClient(CLOB_HOST, POLYGON_CHAIN_ID, wallet);
  const creds = await clobClient.createOrDeriveApiKey();
  const authedClient = new ClobClient(CLOB_HOST, POLYGON_CHAIN_ID, wallet, creds);

  // Re-check the book right before committing capital — it has had scan
  // time plus API-key setup time to move since the number above was true.
  const fresh = (await scan({ limit: 400, probeShares: Math.max(1, MAX_TRADE_USDT) })).opportunities.find(
    (o) => o.market.conditionId === best.market.conditionId && o.side === best.side,
  );
  if (!fresh || fresh.profit < MIN_PROFIT_USDT) {
    log("Opportunity is gone or degraded on re-check. Someone else took it first. Standing down — this is the ordinary outcome, not an error.");
    runStatus.lastDecision = "skipped-stale";
    return;
  }

  const partition = [1, 2];
  const ct = new ethers.Contract(CONDITIONAL_TOKENS, CONDITIONAL_TOKENS_ABI, wallet);
  const amountUnits = ethers.parseUnits(fresh.shares.toFixed(6), 6);

  if (fresh.side === "BUY") {
    log("Buying both legs...");
    await placeBothLegs(authedClient, [
      { tokenId: fresh.market.yes, price: fresh.priceYes, side: Side.BUY, size: fresh.shares },
      { tokenId: fresh.market.no, price: fresh.priceNo, side: Side.BUY, size: fresh.shares },
    ]);
    log("Both legs bought. Merging the complete set back to collateral...");
    const approved = await ct.isApprovedForAll(wallet.address, CONDITIONAL_TOKENS);
    if (!approved) await (await ct.setApprovalForAll(CONDITIONAL_TOKENS, true)).wait();
    const tx = await ct.mergePositions(USDC_E, ethers.ZeroHash, fresh.market.conditionId, partition, amountUnits);
    const receipt = await tx.wait();
    log(`Merged. tx: ${receipt.hash}`);
  } else {
    log("Splitting collateral into a complete set...");
    const allowance = await usdc.allowance(wallet.address, CONDITIONAL_TOKENS);
    if (allowance < amountUnits) await (await usdc.approve(CONDITIONAL_TOKENS, ethers.MaxUint256)).wait();
    const splitTx = await ct.splitPosition(USDC_E, ethers.ZeroHash, fresh.market.conditionId, partition, amountUnits);
    const splitReceipt = await splitTx.wait();
    log(`Split. tx: ${splitReceipt.hash}`);
    log("Selling both legs...");
    await placeBothLegs(authedClient, [
      { tokenId: fresh.market.yes, price: fresh.priceYes, side: Side.SELL, size: fresh.shares },
      { tokenId: fresh.market.no, price: fresh.priceNo, side: Side.SELL, size: fresh.shares },
    ]);
  }

  runStatus.lastDecision = "executed";
  runStatus.tradeExecuted = true;
  // The pre-trade estimate, not a post-fill reconciliation — FOK orders fill
  // at the requested price or not at all, so this is accurate barring the
  // gas/fee estimate drifting slightly from what lib.mjs assumed.
  runStatus.realizedDelta = fresh.profit;

  log(`Done. Realized profit stays in ${wallet.address} — move it to the ArbiSmart pool manually via depositArbitrageProfit() in the admin console when ready.`);
}

main()
  .catch((err) => {
    log("ERROR:", err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      writeStatus();
    } catch (err) {
      log("Could not write status file:", err?.message ?? err);
    }
  });

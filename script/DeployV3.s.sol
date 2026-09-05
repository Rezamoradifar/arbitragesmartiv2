// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { ArbiSmartV3 } from "../src/ArbiSmartV3.sol";

/**
 * @title DeployV3
 * @notice Deploys {ArbiSmartV3} to Polygon mainnet (chain id 137).
 *
 * Usage:
 *
 *   forge script script/DeployV3.s.sol:DeployV3 \
 *     --rpc-url polygon \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Every parameter is read from the environment so no key or address is
 * baked into source. Run without `--broadcast` first: the script prints the
 * full configuration and a worked example of what a depositor will actually
 * receive, so the numbers can be checked before anything is irreversible.
 *
 * @dev The development-fee RATES are immutable once deployed. The wallets can
 *      be repointed afterwards; the rates cannot. Read the printed
 *      "WHAT A DEPOSITOR GETS" block and confirm it matches what the site
 *      advertises before broadcasting — after this transaction the published
 *      fee and the contract's fee can never be brought back into line except
 *      by deploying again.
 */
contract DeployV3 is Script {
    function run() external returns (ArbiSmartV3 deployed) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address arbitrageToken = vm.envAddress("ARBITRAGE_TOKEN");
        address swapRouter = vm.envAddress("SWAP_ROUTER");
        uint24 swapFeeTier = uint24(vm.envUint("SWAP_FEE_TIER"));
        address initialOwner = vm.envAddress("INITIAL_OWNER");
        address feeWallet1 = vm.envAddress("FEE_WALLET_1");
        address feeWallet2 = vm.envAddress("FEE_WALLET_2");
        address profitRecipient = vm.envAddress("PROFIT_RECIPIENT");
        address devWallet1 = vm.envAddress("DEV_FEE_WALLET_1");
        address devWallet2 = vm.envAddress("DEV_FEE_WALLET_2");
        uint256 devBps1 = vm.envUint("DEV_FEE_BPS_1");
        uint256 devBps2 = vm.envUint("DEV_FEE_BPS_2");

        require(collateralToken != address(0), "COLLATERAL_TOKEN not set");
        require(arbitrageToken != address(0), "ARBITRAGE_TOKEN not set");
        require(swapRouter != address(0), "SWAP_ROUTER not set");
        require(collateralToken != arbitrageToken, "collateral and strategy token must differ");
        require(initialOwner != address(0), "INITIAL_OWNER not set");
        require(feeWallet1 != address(0), "FEE_WALLET_1 not set");
        require(feeWallet2 != address(0), "FEE_WALLET_2 not set");
        require(profitRecipient != address(0), "PROFIT_RECIPIENT not set");
        require(devWallet1 != address(0), "DEV_FEE_WALLET_1 not set");
        require(devWallet2 != address(0), "DEV_FEE_WALLET_2 not set");
        require(devBps1 + devBps2 <= 2000, "combined dev fee exceeds the 20% cap");

        console2.log("=== ArbiSmartV3 deployment ===");
        console2.log("collateralToken:  ", collateralToken);
        console2.log("arbitrageToken:   ", arbitrageToken);
        console2.log("swapRouter:       ", swapRouter);
        console2.log("swapFeeTier:      ", swapFeeTier);
        console2.log("initialOwner:     ", initialOwner);
        console2.log("");
        console2.log("-- yield-claim fee (fixed at 5%% + 5%% in the contract) --");
        console2.log("feeWallet1:       ", feeWallet1);
        console2.log("feeWallet2:       ", feeWallet2);
        console2.log("");
        console2.log("-- development fee on deposits (IMMUTABLE once deployed) --");
        console2.log("devFeeWallet1:    ", devWallet1);
        console2.log("devFeeBps1:       ", devBps1);
        console2.log("devFeeWallet2:    ", devWallet2);
        console2.log("devFeeBps2:       ", devBps2);
        console2.log("combined bps:     ", devBps1 + devBps2);
        console2.log("");
        console2.log("-- arbitrage performance fee --");
        console2.log("profitRecipient:  ", profitRecipient);
        console2.log("");

        // A worked example in the collateral's own units, so the number the
        // site advertises can be checked against the number the contract will
        // actually record — before the rate becomes unchangeable.
        uint256 example = 1000_000000; // 1,000 units at 6 decimals
        uint256 exFee1 = (example * devBps1) / 10_000;
        uint256 exFee2 = (example * devBps2) / 10_000;
        console2.log("=== WHAT A DEPOSITOR GETS (per 1,000 deposited) ===");
        console2.log("  to devFeeWallet1: ", exFee1 / 1e6);
        console2.log("  to devFeeWallet2: ", exFee2 / 1e6);
        console2.log("  recorded stake:   ", (example - exFee1 - exFee2) / 1e6);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        deployed = new ArbiSmartV3(
            collateralToken,
            arbitrageToken,
            swapRouter,
            swapFeeTier,
            initialOwner,
            feeWallet1,
            feeWallet2,
            profitRecipient,
            devWallet1,
            devWallet2,
            devBps1,
            devBps2
        );

        vm.stopBroadcast();

        console2.log("ArbiSmartV3 deployed at:", address(deployed));
        console2.log("");
        console2.log("--- on-chain readback ---");
        console2.log("owner():                  ", deployed.owner());
        console2.log("collateralToken():        ", address(deployed.collateralToken()));
        console2.log("arbitrageToken():         ", address(deployed.arbitrageToken()));
        console2.log("developmentFeeWallet1():  ", deployed.developmentFeeWallet1());
        console2.log("developmentFeeWallet2():  ", deployed.developmentFeeWallet2());
        console2.log("DEVELOPMENT_FEE_BPS_1():  ", deployed.DEVELOPMENT_FEE_BPS_1());
        console2.log("DEVELOPMENT_FEE_BPS_2():  ", deployed.DEVELOPMENT_FEE_BPS_2());
        console2.log("");
        console2.log("Next steps, each a separate owner transaction:");
        console2.log("  1. addPartner() for each partner address");
        console2.log("  2. setRecoveryWallet() to the 2-of-2 Safe");
        console2.log("  3. publish the combined development fee wherever users deposit");
    }
}

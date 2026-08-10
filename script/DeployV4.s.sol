// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { ArbiSmartV4 } from "../src/ArbiSmartV4.sol";

/**
 * @title DeployV4
 * @notice Deploys {ArbiSmartV4} to Polygon mainnet (chain id 137).
 *
 * Usage:
 *
 *   forge script script/DeployV4.s.sol:DeployV4 \
 *     --rpc-url polygon \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 *
 * Run it once WITHOUT `--broadcast` first. The script prints the whole
 * configuration and works a real deposit through the fee schedule, so the
 * numbers can be checked against what the site advertises while that is still
 * a document rather than a deployment.
 *
 * @dev V4's fee schedule is a pure function of deposit size, not a constructor
 *      parameter, so the two development-fee bps arguments are ignored by the
 *      deposit path and kept only so the constructor signature still validates
 *      wallets. What matters here is the wallets and the owner.
 */
contract DeployV4 is Script {
    function run() external returns (ArbiSmartV4 deployed) {
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

        console2.log("=========== CONFIGURATION ===========");
        console2.log("owner              ", initialOwner);
        console2.log("collateral (USDT)  ", collateralToken);
        console2.log("strategy (USDC.e)  ", arbitrageToken);
        console2.log("swap router        ", swapRouter);
        console2.log("swap fee tier      ", swapFeeTier);
        console2.log("deposit fee -> dev1", devWallet1);
        console2.log("deposit fee -> dev2", devWallet2);
        console2.log("claim fee   -> fee1", feeWallet1);
        console2.log("claim fee   -> fee2", feeWallet2);
        console2.log("profit recipient   ", profitRecipient);

        vm.startBroadcast(deployerPrivateKey);
        deployed = new ArbiSmartV4(
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
            500,
            500
        );
        vm.stopBroadcast();

        console2.log("");
        console2.log("=========== DEPLOYED ===========");
        console2.log("ArbiSmartV4        ", address(deployed));

        _printSchedule(deployed);
        return deployed;
    }

    /// @dev Works four real deposits through the schedule. If any line here
    ///      disagrees with the published plan table, stop.
    function _printSchedule(ArbiSmartV4 a) internal view {
        console2.log("");
        console2.log("======= WHAT A DEPOSITOR GETS =======");
        _line(a, 100_000000);
        _line(a, 1_000_000000);
        _line(a, 5_000_000000);
        _line(a, 25_000_000000);

        console2.log("");
        console2.log("free window: 24h, exactly 10 USDT, max", a.MAX_FREE_STAKES(), "positions");
        console2.log("a free position cannot claim until it has deposited", a.MIN_ACTIVATION_DEPOSIT());
        console2.log("and its giveaway principal is never returned by either exit path");
    }

    function _line(ArbiSmartV4 a, uint256 gross) internal view {
        (,, uint256 totalFee, uint256 net) = a.quoteDeposit(gross);
        console2.log("deposit", gross / 1e6);
        console2.log("   fee ", totalFee / 1e6, "bps", a.depositFeeBps(gross));
        console2.log("   stake", net / 1e6);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV3 } from "../src/ArbiSmartV3.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice End-to-end against a fork of Polygon mainnet, using the real USDT,
 *         the real bridged USDC, the real Uniswap router and the real
 *         Polymarket Conditional Tokens contract.
 *
 * @dev The unit suite proves the arithmetic; this proves the assumptions.
 *      Mocks cannot tell us whether the USDT/USDC.e pool has liquidity at the
 *      fee tier we hardcoded, whether Polygon USDT's non-standard `approve`
 *      breaks the router flow, or whether Polymarket's CTF actually accepts
 *      the collateral we hand it. Those are the failures that would only show
 *      up in production, so they are checked here instead.
 */
contract ForkMainnetTest is Test {
    IERC20 constant USDT = IERC20(0xc2132D05D31c914a87C6611C10748AEb04B58e8F);
    IERC20 constant USDC_E = IERC20(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174);
    address constant SWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address constant CTF = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045;
    uint24 constant FEE_TIER = 100; // 0.01%

    ArbiSmartV3 arbi;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address feeW1 = makeAddr("feeW1");
    address feeW2 = makeAddr("feeW2");
    address dev1 = makeAddr("dev1");
    address dev2 = makeAddr("dev2");
    address profitRecipient = makeAddr("profitRecipient");

    function setUp() public {
        vm.createSelectFork("https://polygon.gateway.tenderly.co");

        arbi = new ArbiSmartV3(
            address(USDT), address(USDC_E), SWAP_ROUTER, FEE_TIER,
            owner, feeW1, feeW2, profitRecipient, dev1, dev2, 500, 500
        );

        vm.warp(block.timestamp + 25 hours); // past the free window

        deal(address(USDT), alice, 50_000_000000);
        vm.prank(alice, alice);
        USDT.approve(address(arbi), type(uint256).max);
    }

    function _partition() internal pure returns (uint256[] memory p) {
        p = new uint256[](2);
        p[0] = 1;
        p[1] = 2;
    }

    /// @dev Polygon USDT is one of the tokens whose `approve` reverts when
    ///      moving a non-zero allowance to another non-zero value. The
    ///      contract uses `forceApprove` throughout; this confirms that a
    ///      second swap actually succeeds rather than reverting on the stale
    ///      allowance left by the first.
    function test_realUSDT_repeatedSwapsSucceed() public {
        vm.prank(alice, alice);
        arbi.stake(10_000_000000, address(0));

        vm.startPrank(owner);
        arbi.swapToArbitrageToken(200_000000, 198_000000);
        arbi.swapToArbitrageToken(200_000000, 198_000000);
        vm.stopPrank();

        assertGt(arbi.arbitrageTokenBalance(), 0, "USDC.e actually received");
        assertEq(arbi.totalArbitrageDeployed(), 400_000000, "both swaps booked at cost");
    }

    /// @dev The economically important one: does the pool that the fee tier
    ///      points at have enough depth that a real swap clears our 1% floor?
    function test_realUniswapPool_hasDepthForTheStrategySize() public {
        vm.prank(alice, alice);
        arbi.stake(25_000_000000, address(0)); // MAX_STAKE; 22,500 net -> ceiling 4,500

        uint256 size = 4500_000000;
        uint256 floor = (size * 9900) / 10_000;

        vm.prank(owner);
        arbi.swapToArbitrageToken(size, floor);

        uint256 got = arbi.arbitrageTokenBalance();
        assertGe(got, floor, "real fill cleared the contract's own floor");
        emit log_named_uint("USDT in ", size);
        emit log_named_uint("USDC.e out", got);
        emit log_named_uint("slippage bps", ((size - got) * 10_000) / size);
    }

    /// @dev A full round trip through real liquidity. Both legs are dollar
    ///      stablecoins, so the pool should come back close to whole — the
    ///      only losses being the two 0.01% pool fees and spread.
    function test_realRoundTrip_returnsSubstantiallyAllCapital() public {
        vm.prank(alice, alice);
        arbi.stake(10_000_000000, address(0));

        uint256 poolBefore = USDT.balanceOf(address(arbi));

        vm.startPrank(owner);
        arbi.swapToArbitrageToken(1000_000000, 990_000000);
        uint256 held = arbi.arbitrageTokenBalance();
        arbi.swapFromArbitrageToken(held, (held * 9900) / 10_000);
        vm.stopPrank();

        uint256 poolAfter = USDT.balanceOf(address(arbi));
        uint256 lost = poolBefore - poolAfter;

        emit log_named_uint("round-trip cost (USDT)", lost);
        assertLt(lost, 10_000000, "a 1,000 round trip should cost well under 10");
        assertEq(arbi.arbitrageTokenBalance(), 0, "strategy leg emptied");
        // The unrecovered remainder stays on the books as outstanding basis
        // rather than being written off.
        assertEq(arbi.totalArbitrageDeployed(), lost, "shortfall stays visible");
    }

    /// @dev Proves the token-matching problem this whole layer exists to
    ///      solve: the CTF accepts USDC.e from us, which is what makes the
    ///      resulting outcome tokens the ones Polymarket actually trades.
    function test_realPolymarketCTF_acceptsTheStrategyCollateral() public {
        vm.prank(alice, alice);
        arbi.stake(10_000_000000, address(0));

        vm.startPrank(owner);
        arbi.swapToArbitrageToken(500_000000, 495_000000);
        uint256 held = arbi.arbitrageTokenBalance();

        uint256 ctfBefore = USDC_E.balanceOf(CTF);
        bytes32 conditionId = _liveConditionId();
        arbi.executePolymarketSplit(conditionId, _partition(), held);
        vm.stopPrank();

        assertEq(USDC_E.balanceOf(CTF) - ctfBefore, held, "real collateral reached the real CTF");
        assertEq(arbi.arbitrageTokenBalance(), 0, "drawn from the strategy leg");
        assertEq(arbi.committedByCondition(conditionId), held, "commitment tracked");
    }

    /// @dev Splitting and merging the same complete set must net to zero —
    ///      the CTF invariant the profit accounting depends on.
    function test_realCTF_splitThenMergeNetsToZero() public {
        vm.prank(alice, alice);
        arbi.stake(10_000_000000, address(0));

        vm.startPrank(owner);
        arbi.swapToArbitrageToken(500_000000, 495_000000);
        uint256 held = arbi.arbitrageTokenBalance();
        bytes32 conditionId = _liveConditionId();

        arbi.executePolymarketSplit(conditionId, _partition(), held);
        arbi.executePolymarketMerge(conditionId, _partition(), held);
        vm.stopPrank();

        assertEq(arbi.arbitrageTokenBalance(), held, "complete set round-tripped exactly");
        assertEq(arbi.committedByCondition(conditionId), 0, "commitment released");
    }

    /// @dev Stakers must be able to leave whatever the strategy is doing.
    function test_userCanExitWhileCapitalIsOutOnTheStrategy() public {
        vm.prank(alice, alice);
        arbi.stake(10_000_000000, address(0)); // 9,000 net

        vm.prank(owner);
        arbi.swapToArbitrageToken(1800_000000, 1782_000000); // the full 20%

        vm.warp(block.timestamp + 5 weeks); // penalty floor
        uint256 before = USDT.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.earlyExit();

        assertEq(USDT.balanceOf(alice) - before, 8100_000000, "90% of the 9,000 net stake");
    }

    /// @dev A real, already-resolved Polymarket condition would need constant
    ///      maintenance to keep this test green, so a deterministic id is
    ///      derived instead. The CTF prepares it on demand, which is enough
    ///      to exercise the real split/merge code path against real code.
    function _liveConditionId() internal returns (bytes32 conditionId) {
        address oracle = makeAddr("oracle");
        bytes32 questionId = keccak256("arbismart-fork-test");
        (bool ok,) = CTF.call(
            abi.encodeWithSignature("prepareCondition(address,bytes32,uint256)", oracle, questionId, uint256(2))
        );
        require(ok, "prepareCondition failed");
        conditionId = keccak256(abi.encodePacked(oracle, questionId, uint256(2)));
    }
}

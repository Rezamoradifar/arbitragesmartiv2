// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Test } from "forge-std/Test.sol";
import { ArbiSmartV4, ISwapRouter02 } from "../src/ArbiSmartV4.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract XUSD is ERC20 {
    constructor() ERC20("Test USD", "tUSD") { }
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

contract XRouter {
    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata p) external returns (uint256 out) {
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        out = p.amountIn;
        IERC20(p.tokenOut).transfer(p.recipient, out);
    }
}

/**
 * What earlyExit actually returns.
 *
 * The site, the pinned channel post and the deposit calculator all say the
 * early-exit penalty is charged on ACCRUED YIELD and that principal comes back
 * in full. Nothing in the test suite checked that, so these tests measure it:
 * stake a known amount, exit at a known week, and compare the wallet balance
 * before and after.
 */
contract EarlyExitAmountTest is Test {
    XUSD usdc;
    XUSD usdce;
    XRouter router;
    ArbiSmartV4 arbi;

    address owner = address(0xA11CE);
    address alice = address(0xA1);
    uint256 constant DAY = 1 days;

    function setUp() public {
        vm.warp(1_800_000_000);
        usdc = new XUSD();
        usdce = new XUSD();
        router = new XRouter();
        arbi = new ArbiSmartV4(
            address(usdc), address(usdce), address(router), 100, owner,
            address(0xFEE1), address(0xFEE2), address(0xF00D),
            address(0xD001), address(0xD002), 500, 500
        );
        usdc.mint(address(router), 10_000_000_000000);
        usdce.mint(address(router), 10_000_000_000000);
        usdc.mint(alice, 1_000_000_000000);
        vm.prank(alice, alice);
        usdc.approve(address(arbi), type(uint256).max);
        // Past the free-stake window so this is an ordinary paid position.
        vm.warp(block.timestamp + 25 hours);
    }

    /// Exit in week 1, having accrued a few days of yield, and measure.
    function test_WeekOneExitReturnsHalfThePrincipal() public {
        uint256 gross = 1_000_000000; // 1,000 USDT
        vm.prank(alice, alice);
        arbi.stake(gross, address(0));

        (uint256 recorded,,,,,,,) = arbi.getStakeBasic(alice);
        assertEq(recorded, 900_000000, "1,000 gross records 900 after the 10% fee");

        // Three days in: yield has accrued, and we are still inside week 1.
        vm.warp(block.timestamp + 3 * DAY);
        uint256 accrued = arbi.getReward(alice);
        assertGt(accrued, 0, "yield should have accrued");

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.earlyExit();
        uint256 returned = usdc.balanceOf(alice) - before;

        emit log_named_decimal_uint("recorded stake ", recorded, 6);
        emit log_named_decimal_uint("accrued yield  ", accrued, 6);
        emit log_named_decimal_uint("actually got   ", returned, 6);

        // If the penalty were charged on yield, `returned` would be at least
        // the whole principal. Measure which it is.
        assertEq(returned, 450_000000, "week 1 returns half the PRINCIPAL, not half the yield");
        assertLt(returned, recorded, "principal was reduced by the penalty");
    }

    /// After week 5 the rate settles at 10%, still on principal.
    function test_WeekFiveExitReturnsNinetyPercentOfPrincipal() public {
        uint256 gross = 1_000_000000;
        vm.prank(alice, alice);
        arbi.stake(gross, address(0));

        vm.warp(block.timestamp + 5 * 7 * DAY);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.earlyExit();
        uint256 returned = usdc.balanceOf(alice) - before;

        emit log_named_decimal_uint("week 5+ returns", returned, 6);
        assertEq(returned, 810_000000, "week 5+ returns 90% of the 900 principal");
    }

    /// Claiming first does not protect the principal from the penalty.
    function test_ClaimingFirstDoesNotChangeTheExitAmount() public {
        uint256 gross = 1_000_000000;
        vm.prank(alice, alice);
        arbi.stake(gross, address(0));

        vm.warp(block.timestamp + 3 * DAY);
        vm.prank(alice, alice);
        arbi.claim();

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice, alice);
        arbi.earlyExit();
        uint256 returned = usdc.balanceOf(alice) - before;

        assertEq(returned, 450_000000, "the penalty is on principal either way");
    }
}

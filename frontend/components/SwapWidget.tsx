"use client";

import { useMemo } from "react";
import { LiFiWidget, type WidgetConfig } from "@lifi/widget";
import { COLLATERAL_ADDRESS } from "@/lib/contract";

/**
 * Any token, any chain, out the other side as USDT on Polygon.
 *
 * The contract takes exactly one asset and stake() carries onlyEOA, so no
 * amount of on-chain cleverness can widen what it accepts — the conversion has
 * to happen before the deposit, in the user's own wallet. This is that step,
 * in the page, rather than a link to somewhere else.
 *
 * Non-custodial throughout: the routing runs against public liquidity, the
 * user signs every transaction themselves, and ArbiSmart never holds the funds
 * at any point in the trade. That property is the reason this is a widget and
 * not an exchange desk.
 *
 * Heavy, so it is loaded on demand — see the dynamic import in the page that
 * mounts it. Nobody who is not converting should pay for it.
 */
export default function SwapWidget() {
  const config = useMemo<WidgetConfig>(
    () => ({
      integrator: "arbismart",

      // The destination is fixed. The source is deliberately left open: it
      // depends on what the user already holds, which is not ours to assume.
      toChain: 137,
      toToken: COLLATERAL_ADDRESS,

      appearance: "dark",
      variant: "compact",
      subvariant: "default",

      // Reuse the wallet the user has already connected to the site rather
      // than asking them to connect a second time inside the widget.
      walletConfig: { usePartialWalletManagement: true },

      theme: {
        palette: {
          primary: { main: "#e0ad3c" },
          secondary: { main: "#3384fb" },
          background: { default: "#0b0f1c", paper: "#11162a" },
          text: { primary: "#f4f5f8", secondary: "#9aa1b4" },
          grey: { 300: "#2a3145", 800: "#161b2e" },
        },
        shape: { borderRadius: 14, borderRadiusSecondary: 10 },
        typography: { fontFamily: "var(--font-sans), system-ui, sans-serif" },
        container: {
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: "20px",
          boxShadow: "0 32px 64px -32px rgba(0,0,0,.95)",
        },
      },
    }),
    [],
  );

  return <LiFiWidget integrator="arbismart" config={config} />;
}

"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  connectorsForWallets,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hashFn } from "wagmi/query";
import { WagmiProvider, createConfig, http, fallback } from "wagmi";
import { polygon } from "wagmi/chains";
import { useMemo, useState, type ReactNode } from "react";
import { useThemeName } from "@/components/ThemeToggle";

export const APP_NAME = "ArbiSmart";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://arbhub.site";

/**
 * Free public Polygon endpoints, verified reachable and returning chain id 137.
 * Tenderly leads because it is the only one of these that serves wide
 * `eth_getLogs` ranges; the rest cap at ~10k blocks, which the Activity page
 * works around by chunking. Deliberately excluded after testing:
 * polygon-rpc.com (401), rpc.ankr.com (requires a key), llamarpc and meowrpc
 * (unreachable / 522), blastapi (403).
 */
const PUBLIC_POLYGON_RPCS = [
  "https://polygon.gateway.tenderly.co",
  "https://polygon.drpc.org",
  "https://1rpc.io/matic",
  "https://polygon-bor-rpc.publicnode.com",
];

const customRpc = process.env.NEXT_PUBLIC_POLYGON_RPC_URL?.trim();

/**
 * A private endpoint, when configured, is tried first and the public ones stay
 * behind it as automatic failover — so a provider outage or a rate-limit spike
 * degrades instead of taking the whole site down.
 */
const rpcEndpoints = customRpc ? [customRpc, ...PUBLIC_POLYGON_RPCS] : PUBLIC_POLYGON_RPCS;

export const polygonTransport = fallback(
  rpcEndpoints.map((url) => http(url, { batch: true, timeout: 15_000, retryCount: 2 })),
  { rank: { interval: 60_000, sampleCount: 5 } },
);

/**
 * A WalletConnect project id is 32 hex characters. Anything else — unset, an
 * `xxxx…` placeholder copied from the docs, or the all-zero dummy — is treated
 * as absent.
 *
 * This distinction matters at runtime, not just cosmetically: initialising
 * WalletConnect with an invalid id makes the page fire requests to
 * api.web3modal.org and pulse.walletconnect.org that fail and log errors on
 * every load, and the WalletConnect option in the picker then never produces a
 * working QR. Falling back to injected-only wallets keeps the console clean and
 * only offers connectors that actually work.
 */
const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
const projectId = /^[0-9a-fA-F]{32}$/.test(rawProjectId) ? rawProjectId : "";

export const hasWalletConnect = projectId !== "";

const injectedOnly = [
  {
    groupName: "Installed",
    wallets: [injectedWallet, metaMaskWallet],
  },
];

/*
 * walletConnectWallet makes WalletConnect's Core log "already initialized —
 * Init() was called 2 times" once per page load. Measured by elimination:
 * every other wallet here is silent, and this one warns on its own with
 * nothing else in the list. It is wagmi's connector double-initialising under
 * ssr:true, inside the library, not something this file controls.
 *
 * It stays anyway. Dropping it would silence the warning and take with it the
 * QR option for every wallet not named below — a real capability traded for a
 * clean console. The Core is idempotent and connections work; if the warning
 * ever turns into a symptom, this comment is where to start.
 */
const withWalletConnect = [
  {
    groupName: "Popular",
    wallets: [metaMaskWallet, trustWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
  },
  {
    groupName: "Other",
    wallets: [injectedWallet],
  },
];

// `connectorsForWallets` rejects an empty projectId unconditionally, even when
// the wallet list contains no WalletConnect-backed entry. In the fallback path
// this placeholder satisfies that check and is never used: only injected
// connectors are registered, and those never touch the WalletConnect relay.
const connectors = connectorsForWallets(hasWalletConnect ? withWalletConnect : injectedOnly, {
  appName: APP_NAME,
  projectId: hasWalletConnect ? projectId : "injected-only-no-walletconnect",
  appUrl: APP_URL,
});

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors,
  transports: {
    [polygon.id]: polygonTransport,
  },
  ssr: true,
});

/**
 * RainbowKit is themed with a JavaScript object, not CSS, so it cannot ride
 * the variable swap the rest of the app uses — it has to be rebuilt when the
 * theme changes. Gold stays gold in both; only the surfaces move.
 */
function useWalletTheme() {
  const theme = useThemeName();

  return useMemo(() => {
    const base = { accentColor: "#e0ad3c", accentColorForeground: "#05060b" };
    const opts = { ...base, borderRadius: "large", overlayBlur: "small" } as const;

    if (theme === "light") {
      const t = lightTheme(opts);
      return {
        ...t,
        colors: {
          ...t.colors,
          ...base,
          modalBackground: "#ffffff",
          modalBorder: "rgba(13,17,26,.08)",
          profileForeground: "#f4f6fa",
          connectButtonBackground: "#ffffff",
          connectButtonInnerBackground: "#f0f3f8",
          menuItemBackground: "#f0f3f8",
          generalBorder: "rgba(13,17,26,.08)",
        },
      };
    }

    const t = darkTheme(opts);
    return {
      ...t,
      colors: {
        ...t.colors,
        ...base,
        modalBackground: "#0d0f18",
        modalBorder: "rgba(255,255,255,.07)",
        profileForeground: "#131622",
        connectButtonBackground: "#131622",
        connectButtonInnerBackground: "#191d2c",
        menuItemBackground: "#191d2c",
        generalBorder: "rgba(255,255,255,.07)",
      },
    };
  }, [theme]);
}

export function Web3Providers({ children }: { children: ReactNode }) {
  const walletTheme = useWalletTheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * REQUIRED, not a preference.
             *
             * A wagmi query key contains the contract call's arguments, and on
             * this chain amounts are `bigint`. TanStack's default key hash is
             * JSON.stringify, which throws outright on a BigInt — so the first
             * hook that passes an amount as an argument (quoteDeposit, on the
             * deposit form) took down the entire dashboard with "Application
             * error: a client-side exception has occurred".
             *
             * It stayed hidden until a wallet was connected, because the form
             * that issues that call only renders for a connected address.
             * wagmi ships a BigInt-aware replacer for exactly this; installing
             * it here covers every present and future call rather than the one
             * that happened to expose it.
             */
            queryKeyHashFn: hashFn,
            // Chain reads are cheap and the UI is state-heavy; refetching on
            // every window focus produced visible flicker on the dashboard.
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* The connect button is the most prominent control on every page, so
            it has to be the palette's primary action rather than RainbowKit's
            default teal — an off-brand accent there reads as a third-party
            widget bolted onto the design. See useWalletTheme for the surfaces. */}
        <RainbowKitProvider theme={walletTheme} appInfo={{ appName: APP_NAME }} initialChain={polygon}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

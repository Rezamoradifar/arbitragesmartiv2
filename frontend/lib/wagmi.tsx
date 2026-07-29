"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { connectorsForWallets, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, fallback } from "wagmi";
import { polygon } from "wagmi/chains";
import { useState, type ReactNode } from "react";

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

export function Web3Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
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
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#1aab84", borderRadius: "large" })}
          appInfo={{ appName: APP_NAME }}
          initialChain={polygon}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

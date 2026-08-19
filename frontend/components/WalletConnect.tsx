"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Icon } from "@/components/Icon";

/**
 * Branded stand-ins for RainbowKit's default <ConnectButton>, built on
 * ConnectButton.Custom so every state reads as ArbiSmart's own button
 * classes (.btn-primary / .btn-secondary / .btn-danger) instead of a
 * generic wallet widget dropped onto the page.
 *
 * Two sizes because the button appears in two different roles: a compact
 * one for the header, always visible, and a full CTA for the "connect to
 * continue" gates on Dashboard/Portfolio/Admin/Partners — the first thing
 * a new visitor actually clicks, so it gets the same weight as a deposit
 * button rather than whatever RainbowKit ships by default.
 */

function useConnectState() {
  return ConnectButton.Custom;
}

export function WalletConnectButton() {
  const Custom = useConnectState();
  return (
    <Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready && account && chain && (authenticationStatus === "authenticated" || !authenticationStatus);

        return (
          <div {...(!ready && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none" } })}>
            {!connected ? (
              <button type="button" onClick={openConnectModal} className="btn-primary !px-4 !py-2 !text-[13px]">
                <Icon name="wallet" className="h-4 w-4" />
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button type="button" onClick={openChainModal} className="btn-danger !px-4 !py-2 !text-[13px]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-danger-400" />
                Wrong network
              </button>
            ) : (
              <button
                type="button"
                onClick={openAccountModal}
                className="btn-secondary !px-3 !py-2 !text-[13px]"
              >
                <LiveDot />
                {account.displayName}
              </button>
            )}
          </div>
        );
      }}
    </Custom>
  );
}

export function WalletConnectCTA({ className = "" }: { className?: string }) {
  const Custom = useConnectState();
  return (
    <Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready && account && chain && (authenticationStatus === "authenticated" || !authenticationStatus);

        return (
          <div {...(!ready && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none" } })}>
            {!connected ? (
              <button type="button" onClick={openConnectModal} className={`btn-primary ${className}`}>
                <Icon name="wallet" className="h-[18px] w-[18px]" />
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button type="button" onClick={openChainModal} className={`btn-danger ${className}`}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-danger-400" />
                Switch to Polygon
              </button>
            ) : (
              <button type="button" onClick={openAccountModal} className={`btn-secondary ${className}`}>
                <LiveDot />
                {account.displayName}
              </button>
            )}
          </div>
        );
      }}
    </Custom>
  );
}

/** Pulsing dot borrowed from the "Live" status badge elsewhere in the app. */
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success-400" />
    </span>
  );
}

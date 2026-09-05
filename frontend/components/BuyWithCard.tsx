"use client";

import { useAccount } from "wagmi";
import { Alert } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CopyButton } from "@/components/CopyButton";

/**
 * Buying USDT with a bank card.
 *
 * The swap widget above solves "I have crypto on the wrong chain". This solves
 * the other half, which is the one that actually stops people: they have money
 * in a bank and no crypto at all.
 *
 * An embedded on-ramp widget needs a partner key from the provider — free, but
 * theirs to issue. Until one is set, this renders the providers as links
 * rather than pretending to be an integration, which is the same rule the
 * assistant follows: no button that fails when pressed. Set
 * NEXT_PUBLIC_TRANSAK_API_KEY and the widget takes over, with the wallet
 * address and network already filled in.
 *
 * The warning below the list is the important part of this component. Every
 * one of these providers can deliver USDT on half a dozen chains, and choosing
 * the wrong one sends the money somewhere this contract cannot see. That
 * mistake is not reversible and it is the single most common way people lose
 * funds getting started.
 */

const TRANSAK_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;

type Provider = {
  name: string;
  href: (addr?: string) => string;
  blurb: string;
  cost: string;
};

const PROVIDERS: Provider[] = [
  {
    name: "MoonPay",
    href: (addr) =>
      `https://www.moonpay.com/buy/usdt${addr ? `?walletAddress=${addr}` : ""}`,
    blurb: "Card and Apple Pay, most countries. Pick the Polygon network at checkout.",
    cost: "typically 3–5%",
  },
  {
    name: "Transak",
    href: (addr) =>
      `https://global.transak.com/?cryptoCurrencyCode=USDT&network=polygon${
        addr ? `&walletAddress=${addr}` : ""
      }`,
    blurb: "Card and bank transfer. Polygon and USDT are preselected by this link.",
    cost: "typically 2–4%",
  },
  {
    name: "A major exchange",
    href: () => "https://www.binance.com/en/how-to-buy/tether",
    blurb:
      "Binance, OKX, Bybit and others sell USDT by card, then let you withdraw it. Cheapest, and the slowest to set up.",
    cost: "often under 2%",
  },
];

export function BuyWithCard() {
  const { address } = useAccount();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">Buy with a bank card</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">
          If you hold no crypto at all, this is the starting point. These are outside services — we
          take no part in the payment and receive nothing from it.
        </p>
      </div>

      {TRANSAK_KEY ? (
        <div className="glass overflow-hidden p-0">
          <iframe
            title="Buy USDT with a card"
            src={
              `https://global.transak.com/?apiKey=${TRANSAK_KEY}` +
              `&cryptoCurrencyCode=USDT&network=polygon&fiatCurrency=USD&defaultFiatAmount=100` +
              (address ? `&walletAddress=${address}&disableWalletAddressForm=true` : "")
            }
            className="h-[38rem] w-full border-0"
            allow="camera;microphone;payment"
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <a
              key={p.name}
              href={p.href(address)}
              target="_blank"
              rel="noreferrer noopener"
              className="glass glass-hover flex flex-col p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-white">{p.name}</span>
                <Icon name="external" className="h-4 w-4 text-graphite-400" />
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-graphite-400">{p.blurb}</p>
              <p className="mt-3 text-[11px] text-gold-300">Fee {p.cost}</p>
            </a>
          ))}
        </div>
      )}

      <Alert tone="warn" title="Choose Polygon, and check the address">
        Every one of these can send USDT on several different networks. USDT delivered on Ethereum,
        Tron or BSC will not arrive here and cannot be recovered by us or by them. Select{" "}
        <span className="font-semibold text-white">Polygon</span> before you pay.
      </Alert>

      {address && (
        <div className="glass p-4">
          <p className="text-xs text-graphite-400">Your wallet address, to paste into the provider</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-graphite-100">
              {address}
            </code>
            <CopyButton value={address} />
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-graphite-500">
        These providers verify identity and are unavailable in some countries — that comes with
        paying by card and is not something we control. You will also need a small amount of POL for
        gas; buying a little of that at the same time saves a second trip. We never see your card
        details, and no payment passes through this site.
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { WalletConnectCTA } from "@/components/WalletConnect";
import { Alert, Row } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useUserPosition } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { CONTACT_HREF, CONTACT_LABEL, EMAIL_LIVE } from "@/lib/contact";

/**
 * Claiming a physical gold bar.
 *
 * Two things have to be true before a bar is posted: the claimant controls the
 * wallet that earned it, and there is a real address to send it to. The first
 * is settled cryptographically — a signature from the winning address, which
 * nobody else can produce. The second needs personal data, and personal data
 * is the part worth being careful with.
 *
 * So none of it touches the server. The form assembles the claim in the
 * browser and hands it back to the claimant to send. There is no endpoint, no
 * database and no file: data that was never stored cannot leak, cannot be
 * subpoenaed, and does not put the operator inside GDPR's special-category
 * regime for the sake of a mailing label.
 *
 * It also does not ask for an ID document. Identity is checked by a person
 * when the shipment is actually arranged; a passport scan sitting in an inbox
 * for months is a liability that buys nothing at this stage.
 */

/*
 * Placeholders are shapes, not names.
 *
 * A sample person's name sitting in a legal-name field gets typed in by
 * somebody, and a courier label is the wrong place to discover that. Each
 * placeholder here shows the format expected and nothing that could be
 * mistaken for an answer.
 */
const FIELDS = [
  {
    id: "name",
    label: "Full legal name",
    hint: "As it appears on the ID you will show at delivery",
    placeholder: "First and last name",
    required: true,
  },
  { id: "country", label: "Country", hint: "", placeholder: "Country", required: true },
  { id: "city", label: "City", hint: "", placeholder: "City", required: true },
  {
    id: "address",
    label: "Street address",
    hint: "Including any building or unit number",
    placeholder: "Street, number, building, unit",
    required: true,
  },
  { id: "postcode", label: "Postal code", hint: "", placeholder: "Postal code", required: true },
  {
    id: "phone",
    label: "Phone number",
    hint: "The courier will need it",
    placeholder: "With country code",
    required: true,
  },
  {
    id: "email",
    label: "Email",
    hint: "Where we reply about the shipment",
    placeholder: "you@example.com",
    required: true,
  },
] as const;

type FieldId = (typeof FIELDS)[number]["id"];

export function GoldClaimForm() {
  const { address, isConnected } = useAccount();
  const user = useUserPosition();
  const { signMessageAsync, isPending } = useSignMessage();

  const [values, setValues] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const missing = FIELDS.filter((f) => f.required && !values[f.id]?.trim()).map((f) => f.label);
  const complete = missing.length === 0;

  const statement = useMemo(
    () =>
      address
        ? [
            "ArbiSmart gold reward claim",
            `Wallet: ${address}`,
            `Date: ${new Date().toISOString().slice(0, 10)}`,
            "I control this wallet and I am claiming the gold reward earned by it.",
          ].join("\n")
        : "",
    [address],
  );

  async function sign() {
    setError(null);
    try {
      const sig = await signMessageAsync({ message: statement });
      setSignature(sig);
    } catch {
      setError("Signing was cancelled or refused by the wallet.");
    }
  }

  const claim = useMemo(() => {
    if (!signature || !address) return "";
    return [
      "=== ARBISMART GOLD REWARD CLAIM ===",
      "",
      `Wallet:        ${address}`,
      `Team volume:   ${formatAmount(user.teamVolume)} USDT (read on-chain at time of claim)`,
      "",
      ...FIELDS.map((f) => `${(f.label + ":").padEnd(19)}${values[f.id]?.trim() ?? ""}`),
      "",
      "--- signed statement ---",
      statement,
      "",
      "--- signature ---",
      signature,
      "",
      "Verify at https://etherscan.io/verifiedSignatures or with viem's verifyMessage.",
    ].join("\n");
  }, [signature, address, user.teamVolume, values, statement]);

  if (!isConnected) {
    return (
      <div className="glass p-6 text-center sm:p-8">
        <Icon name="wallet" className="mx-auto h-8 w-8 text-gold-300" />
        <h3 className="mt-4 font-display text-lg font-semibold text-white">
          Connect the wallet that earned the reward
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-graphite-300">
          A claim is only accepted from the winning address itself. Connecting proves nothing on its
          own — you will be asked to sign a statement, which costs no gas and moves no funds.
        </p>
        <div className="mt-6 flex justify-center">
          <WalletConnectCTA />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">1. Your wallet</h3>
        <div className="mt-4 space-y-1">
          <Row label="Claiming address" value={<span className="font-mono text-xs">{address}</span>} />
          <Row label="Team volume on-chain" value={`${formatAmount(user.teamVolume)} USDT`} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-graphite-500">
          Eligibility is decided against the thresholds published for the round, which are still
          being set. This figure is what the contract records for you right now.
        </p>
      </div>

      <div className="glass p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">2. Where the bar goes</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">
          A courier needs a real name and address. Nothing here is sent anywhere by this page — it
          stays in your browser until you send it yourself in the last step.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.id} className={f.id === "address" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={`claim-${f.id}`}>
                {f.label}
              </label>
              <input
                id={`claim-${f.id}`}
                className="input"
                value={values[f.id] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                autoComplete={
                  ({
                    name: "name",
                    country: "country-name",
                    city: "address-level2",
                    address: "street-address",
                    postcode: "postal-code",
                    phone: "tel",
                    email: "email",
                  } as Record<FieldId, string>)[f.id]
                }
              />
              {f.hint && <p className="mt-1 text-[11px] text-graphite-500">{f.hint}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">3. Sign the claim</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">
          This is what makes the claim yours and nobody else&apos;s. It costs no gas, moves no
          funds, and grants no permission over anything.
        </p>

        {!signature ? (
          <>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/[.07] bg-white/[.02] p-4 text-xs leading-relaxed text-graphite-300">
              {statement}
            </pre>
            {!complete && (
              <p className="mt-3 text-xs text-graphite-400">
                Fill in the fields above first — missing: {missing.join(", ")}.
              </p>
            )}
            <button
              type="button"
              onClick={sign}
              disabled={!complete || isPending}
              className="btn-primary mt-4 disabled:opacity-40"
            >
              {isPending ? "Waiting for your wallet…" : "Sign the statement"}
            </button>
            {error && <p className="mt-3 text-xs text-danger-400">{error}</p>}
          </>
        ) : (
          <div className="mt-4">
            <Alert tone="good" title="Signed">
              Your claim is ready to send in the next step.
            </Alert>
          </div>
        )}
      </div>

      {signature && (
        <div className="glass glass-gold p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-white">4. Send it to us</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-graphite-300">
            Copy the block below and send it to us on Telegram at {CONTACT_LABEL}. Nothing is
            transmitted from this page — you send it yourself, to a place you can see.
          </p>

          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[.07] bg-white/[.02] p-4 text-[11px] leading-relaxed text-graphite-300">
            {claim}
          </pre>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                void navigator.clipboard.writeText(claim);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }}
            >
              {copied ? "Copied" : "Copy the claim"}
            </button>
            <a className="btn-secondary" href={CONTACT_HREF} target="_blank" rel="noreferrer">
              {EMAIL_LIVE ? "Open in my mail app" : "Open Telegram"}
            </a>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-graphite-400">
            We will reply from {CONTACT_LABEL} to arrange the shipment and to check your ID at that
            point. We will never ask for a seed phrase, a private key, or a payment to release a
            prize — anyone who does is not us.
          </p>
        </div>
      )}
    </div>
  );
}

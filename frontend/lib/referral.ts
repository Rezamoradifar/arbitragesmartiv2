import { isAddress, getAddress } from "viem";

/**
 * Holding on to a referral code.
 *
 * The deposit form used to read ?ref= straight out of the URL and no further.
 * That loses the referral in every case where the address bar changes between
 * arriving and depositing, and on a phone that is the normal case, not the
 * edge one: a link opened from Telegram, then reopened inside the wallet's own
 * browser, arrives at the bare domain with no query string. The contract takes
 * the zero address without complaint, the deposit succeeds, and nobody finds
 * out until the upline asks where their team member went. It cannot be
 * repaired afterwards — referrals[user].referrer is written once, inside
 * stake(), and there is no setter.
 *
 * So the code is captured the moment any page sees it and kept in
 * localStorage, which survives the round trip through the wallet.
 */

const KEY = "arbismart-ref";

/**
 * Validate loosely, store strictly.
 *
 * Checksum validation is deliberately off: referral links get lowercased by
 * chat clients and by people retyping them, and rejecting a lowercase address
 * would throw away a perfectly good referral. getAddress puts the checksum
 * back on before anything is stored or sent.
 */
export function normaliseRef(value: string | null | undefined): `0x${string}` | null {
  if (!value) return null;
  const v = value.trim();
  if (!isAddress(v, { strict: false })) return null;
  try {
    return getAddress(v);
  } catch {
    return null;
  }
}

/** Read ?ref= off the current URL and remember it. Safe to call repeatedly. */
export function captureReferral(): void {
  if (typeof window === "undefined") return;
  const found = normaliseRef(new URLSearchParams(window.location.search).get("ref"));
  if (!found) return;
  try {
    window.localStorage.setItem(KEY, found);
  } catch {
    // Private browsing, or storage disabled. The URL still works for this
    // visit; there is nothing to fall back to and nothing worth breaking for.
  }
}

export function getStoredReferral(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  try {
    return normaliseRef(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function clearReferral(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

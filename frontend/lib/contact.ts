/**
 * Where the site tells people to reach us.
 *
 * The domain has no MX record, so mail to support@arbhub.site is refused by
 * the internet before it reaches anybody. That address was printed on five
 * pages, in the footer, and in the assistant's answers, which means the one
 * thing a confused or worried visitor was told to do quietly failed.
 *
 * Telegram works today, so Telegram is what the site offers. When a mailbox
 * exists, set EMAIL_LIVE to true and the addresses reappear everywhere at
 * once — that is the only reason this file exists rather than the strings
 * being deleted.
 *
 * Do not set it true before sending a real message to the address and
 * receiving it. A contact route that looks official and silently drops
 * messages is worse than no contact route: the visitor believes they have
 * been heard.
 */

export const TELEGRAM_URL = "https://t.me/arbhub_site";
export const TELEGRAM_HANDLE = "@arbhub_site";

/** Flip once the mailbox exists AND a test message has arrived. */
export const EMAIL_LIVE = false;

export const SUPPORT_EMAIL = "support@arbhub.site";
export const SECURITY_EMAIL = "security@arbhub.site";

/** A working href for general contact, whichever route is currently real. */
export const CONTACT_HREF = EMAIL_LIVE ? `mailto:${SUPPORT_EMAIL}` : TELEGRAM_URL;

/** What to call it in a button or a sentence. */
export const CONTACT_LABEL = EMAIL_LIVE ? SUPPORT_EMAIL : TELEGRAM_HANDLE;

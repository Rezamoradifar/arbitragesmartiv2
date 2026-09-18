import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ArbiSmart Mini App",
  description: "The plan, the fees and how to join — inside Telegram.",
  /**
   * Not indexed. This page exists to be opened from a Telegram button, and a
   * search result landing someone on a chrome-less page with no way back to
   * the rest of the site is a worse result than not appearing at all.
   */
  robots: { index: false, follow: false },
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}

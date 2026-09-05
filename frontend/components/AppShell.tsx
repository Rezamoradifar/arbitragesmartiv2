"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Assistant } from "@/components/Assistant";
import { captureReferral } from "@/lib/referral";

/**
 * Site chrome, minus the chrome on the Telegram Mini App.
 *
 * /tg renders inside Telegram's own WebView, which already supplies a header,
 * a back button and a close button. Drawing our header and bottom tab bar on
 * top of that gives the user two sets of navigation stacked on a phone-sized
 * viewport, and the bottom bar lands exactly where Telegram's own gesture area
 * is. So the Mini App route gets the page and nothing else.
 *
 * The nav and footer arrive as props rather than being imported here, so they
 * stay server components and their weight never reaches the client bundle.
 */
export function AppShell({
  nav,
  footer,
  mobileNav,
  children,
}: {
  nav: React.ReactNode;
  footer: React.ReactNode;
  mobileNav: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Every page, not just the dashboard, and on every navigation — a referral
  // link can point anywhere, and the one place it must not be missed is the
  // first page the visitor lands on.
  useEffect(() => {
    captureReferral();
  }, [pathname]);

  if (pathname?.startsWith("/tg")) {
    return <main className="layer">{children}</main>;
  }

  return (
    <>
      {nav}
      {/* Bottom padding clears the bottom tab bar; xl drops it again once that
          bar is gone. Must track MobileNav's own breakpoint — if the two
          disagree, the bar covers the last row of content. */}
      <main className="layer pb-28 xl:pb-0">{children}</main>
      {footer}
      {mobileNav}
      <Assistant />
    </>
  );
}

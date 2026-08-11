"use client";

import { usePathname } from "next/navigation";

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

  if (pathname?.startsWith("/tg")) {
    return <main className="layer">{children}</main>;
  }

  return (
    <>
      {nav}
      {/* Bottom padding clears the mobile tab bar; the lg breakpoint drops it
          again once that bar is gone. */}
      <main className="layer pb-28 lg:pb-0">{children}</main>
      {footer}
      {mobileNav}
    </>
  );
}

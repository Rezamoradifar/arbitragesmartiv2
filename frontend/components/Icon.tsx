/**
 * One icon set, drawn on a shared 24px grid with a 1.6 stroke.
 *
 * Inline rather than an icon package: the app needs about a dozen glyphs, and
 * a dependency would ship thousands. Consistent geometry matters more than
 * breadth here — mixing sets is the fastest way to make an interface look
 * assembled rather than designed.
 */

export type IconName =
  | "home" | "grid" | "chart" | "shield" | "users" | "activity" | "settings"
  | "wallet" | "arrowUp" | "arrowDown" | "check" | "copy" | "external"
  | "lock" | "globe" | "layers" | "zap" | "bell" | "plus" | "minus" | "info";

const paths: Record<IconName, JSX.Element> = {
  home: <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></>,
  chart: <><path d="M3 20h18" /><path d="M6 20v-6M11 20V8M16 20v-9M21 20V5" /></>,
  shield: <><path d="M12 3l7.5 3v6c0 4.6-3.1 8.2-7.5 9.6C7.6 20.2 4.5 16.6 4.5 12V6z" /><path d="M9.2 12.2l2 2 3.8-4" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" /><path d="M16.5 5.3a3.2 3.2 0 0 1 0 6.1M18 20a6.2 6.2 0 0 0-2.2-4.8" /></>,
  activity: <path d="M3 12h4l2.5-7 5 14L17 12h4" />,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  wallet: <><rect x="2.5" y="5.5" width="19" height="13.5" rx="2.6" /><path d="M2.5 9.5h19" /><circle cx="17" cy="14.5" r="1.3" fill="currentColor" stroke="none" /></>,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M18 13l-6 6-6-6" />,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2.2" /><path d="M15.5 5.5H5.8A2.3 2.3 0 0 0 3.5 7.8v9.7" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 10.5 13.5" /><path d="M19 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h5" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.4" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></>,
  layers: <><path d="M12 3 3 8l9 5 9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17.5 12 22l9-4.5" /></>,
  zap: <path d="M13.5 2 4 13.5h6.5L10 22l9.5-11.5H13z" />,
  bell: <><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" /></>,
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

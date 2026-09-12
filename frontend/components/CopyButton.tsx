"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Copy-to-clipboard with a confirmation that clears itself.
 *
 * The confirmation matters more than it looks: the values being copied here
 * are contract addresses, and a user who is not sure the copy worked will
 * retype one by hand. That is exactly the situation that ends with funds at
 * the wrong address.
 */
export function CopyButton({
  value,
  label = "Copy",
  className = "btn-secondary",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
    >
      <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
      {copied ? "Copied" : label}
    </button>
  );
}

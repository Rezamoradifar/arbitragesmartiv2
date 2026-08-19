"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Isolated client island so the promo grid itself can stay a server component. */
export function CopyCaptionButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS or permission denied) — the
      // caption is still selectable/readable on the card, nothing is lost.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-secondary w-full !py-2 !text-[13px]">
      <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
      {copied ? "Copied" : "Copy caption"}
    </button>
  );
}

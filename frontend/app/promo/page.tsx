import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { Badge } from "@/components/ui";
import { CopyCaptionButton } from "@/components/CopyCaptionButton";

export const metadata: Metadata = {
  title: "Promo kit",
  description:
    "Ready-made branded images and captions for anyone sharing ArbiSmart — one verified fact per card, download the image, copy the caption, post it as-is.",
};

type BankItem = { id: string; text: string; image?: string };

const STANDARD_TAGS = new Set(["ArbiSmart", "Polygon", "USDT"]);

function loadItems(): BankItem[] {
  // docs/ sits one level up from frontend/ in the same checkout, on the
  // dev machine and on the deploy server alike — read straight from the
  // single source of truth instead of keeping a second copy that could
  // drift out of sync with the Telegram content bank.
  const bankPath = path.join(process.cwd(), "..", "docs", "telegram-content-bank.json");
  const bank = JSON.parse(fs.readFileSync(bankPath, "utf8")) as { items: BankItem[] };
  return bank.items.filter((item) => item.image);
}

function splitCaption(text: string) {
  const [body, tagLine] = text.split(/\n\n(?=#)/);
  const tags = (tagLine ?? "").match(/#\w+/g)?.map((t) => t.slice(1)) ?? [];
  const category = tags.find((t) => !STANDARD_TAGS.has(t)) ?? "Update";
  return { body, category };
}

export default function PromoPage() {
  const items = loadItems();

  return (
    <div className="container-page space-y-10 py-16">
      <div className="max-w-3xl">
        <p className="eyebrow">Promo kit</p>
        <h1 className="h-section mt-4">Ready-made posts, if you want to share this</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-graphite-300">
          Every card below pairs one verified, on-chain fact with the exact wording already used on
          our own channel — nothing here is written for you to spin or exaggerate. Download the
          image, copy the caption, post it as-is.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const { body, category } = splitCaption(item.text);
          const src = `/promo-cards/${item.id}.png`;
          return (
            <div key={item.id} className="glass-panel overflow-hidden !p-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- static
                  pre-rendered PNGs served from /public, no optimisation needed */}
              <img src={src} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
              <div className="p-5">
                <Badge tone={category === "Scam" ? "bad" : "brand"}>{category}</Badge>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-graphite-300">{body}</p>
                <div className="mt-4 flex gap-2">
                  <a href={src} download className="btn-secondary flex-1 !py-2 !text-[13px]">
                    Download image
                  </a>
                  <CopyCaptionButton text={item.text} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

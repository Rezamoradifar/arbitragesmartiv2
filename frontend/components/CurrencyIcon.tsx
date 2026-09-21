import Image from "next/image";

export function CurrencyIcon({ symbol, size = 32 }: { symbol: string; size?: number }) {
  // Every call site uses a supported market symbol; assets are vendored CC0 SVGs.
  const supported = ["btc", "eth", "sol", "xrp", "doge", "link", "usdt"];
  const name = symbol.toLowerCase();
  if (!supported.includes(name)) return null;
  return <Image src={`/icons/crypto/${name}.svg`} width={size} height={size} alt="" className="asset-icon" />;
}

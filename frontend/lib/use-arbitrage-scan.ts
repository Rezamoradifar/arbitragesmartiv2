"use client";
import { useQuery } from "@tanstack/react-query";
import { parseArbitrageScan } from "./arbitrage-scan";

export function useArbitrageScan() {
  return useQuery({
    queryKey: ["arbitrage-scan"],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/arbitrage-status.json?t=${Date.now()}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("No scanner report published");
      return parseArbitrageScan(await response.json());
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
}

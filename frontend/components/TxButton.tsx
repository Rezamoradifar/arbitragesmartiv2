"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

export function useContractTx(onSuccess?: () => void) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  // The ABI is imported from JSON rather than declared `as const`, so wagmi
  // cannot infer the function/argument union and demands the fully-resolved
  // request shape. Runtime behaviour is unaffected; the cast only silences
  // inference that has nothing to infer from.
  function call(functionName: string, args: unknown[] = []) {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName,
      args,
    } as never);
  }

  return { call, hash, isPending, isConfirming, isConfirmed, error, reset };
}

export function TxStatus({
  isPending,
  isConfirming,
  isConfirmed,
  error,
  hash,
}: {
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: Error | null;
  hash?: string;
}) {
  if (error) {
    return (
      <p className="mt-3 rounded-lg border border-danger-400/25 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
        {error.message.split("\n")[0]}
      </p>
    );
  }
  if (isPending) return <TxPending>Confirm in your wallet…</TxPending>;
  if (isConfirming) return <TxPending>Waiting for confirmation…</TxPending>;
  if (isConfirmed)
    return (
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-success-400">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-success-500/20">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 12.5l5 5 10-11" />
          </svg>
        </span>
        Confirmed on-chain.
        {hash && (
          <a
            className="underline underline-offset-2 hover:text-success-400/80"
            href={`https://polygonscan.com/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        )}
      </p>
    );
  return null;
}

function TxPending({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-graphite-300">
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400" />
      {children}
    </p>
  );
}

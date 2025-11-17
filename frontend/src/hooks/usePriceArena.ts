import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatEther, formatUnits } from "viem";

import { LUMEN_PRICE_ARENA_ADDRESS, LUMEN_PRICE_ARENA_ABI } from "@/constants/contracts";
import { decryptDirections, encryptDirection } from "@/lib/fhe";
import { notifyTransaction, notifyError } from "@/lib/notifications";

const ORACLE_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

export function usePriceArena() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const { data: entryFeeWei } = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "entryFee"
  });

  const { data: oracleAddress } = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "defaultOracle"
  });

  const { data: latestContestIdData } = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "latestContestId",
    query: { refetchInterval: 20_000 }
  });

  const contestId = latestContestIdData ? Number(latestContestIdData) : 0;

  const contestQuery = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "getContest",
    args: contestId ? [BigInt(contestId)] : undefined,
    query: { enabled: contestId > 0, refetchInterval: 15_000 }
  });

  const boundsQuery = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "getRangeBounds",
    args: contestId ? [BigInt(contestId)] : undefined,
    query: { enabled: contestId > 0 }
  });

  const statsQuery = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "getRangeStats",
    args: contestId ? [BigInt(contestId)] : undefined,
    query: { enabled: contestId > 0, refetchInterval: 20_000 }
  });

  const statusQuery = useReadContract({
    address: LUMEN_PRICE_ARENA_ADDRESS,
    abi: LUMEN_PRICE_ARENA_ABI,
    functionName: "getPlayerStatus",
    args: contestId && address ? [BigInt(contestId), address] : undefined,
    query: { enabled: contestId > 0 && Boolean(address), refetchInterval: 15_000 }
  });

  const { data: priceData } = useReadContract({
    address: oracleAddress,
    abi: ORACLE_ABI,
    functionName: "latestRoundData",
    query: { enabled: Boolean(oracleAddress), refetchInterval: 10_000 }
  });

  const contest = useMemo(() => {
    const result = contestQuery.data as
      | readonly [bigint, bigint, bigint, bigint, boolean, boolean, boolean, number]
      | undefined;
    if (!result || contestId === 0) return null;
    const [startTime, lockTime, settleTime, prizePool, directionsReady, settled, rolledOver, winningRange] = result;
    return {
      contestId,
      startTime: Number(startTime),
      lockTime: Number(lockTime),
      settleTime: Number(settleTime),
      prizePoolWei: prizePool,
      exposuresReady: directionsReady,
      settled,
      rolledOver,
      winningRange
    };
  }, [contestQuery.data, contestId]);

  const entryFee = entryFeeWei ? formatEther(entryFeeWei) : null;
  const rangeBounds = boundsQuery.data ? (boundsQuery.data as bigint[]).map((v) => Number(v)) : [];
  const rangeStats = statsQuery.data as
    | { cipher: `0x${string}`; revealedExposure: bigint; entrants: bigint }[]
    | undefined;
  const playerStatus = statusQuery.data as readonly [boolean, boolean, boolean] | undefined;

  // Assuming Oracle returns 8 decimals (standard for Chainlink USD pairs)
  const currentPrice = priceData ? Number(formatUnits(priceData[1], 8)) : null;

  const invalidate = () => queryClient.invalidateQueries();

  const enterContest = useMutation({
    mutationFn: async ({ predictUp }: { predictUp: boolean }) => {
      if (!address) throw new Error("Wallet not connected");
      if (!entryFeeWei) throw new Error("Entry fee not loaded");
      if (contestId === 0) throw new Error("Contest not ready");

      const { ciphertext, proof } = await encryptDirection(predictUp, LUMEN_PRICE_ARENA_ADDRESS, address);

      const hash = await writeContractAsync({
        address: LUMEN_PRICE_ARENA_ADDRESS,
        abi: LUMEN_PRICE_ARENA_ABI,
        functionName: "enterContest",
        args: [ciphertext, proof],
        value: entryFeeWei
      });

      notifyTransaction(hash, "pending", "Submitting prediction...");

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          notifyTransaction(hash, "success", `Prediction ${predictUp ? "UP" : "DOWN"} submitted`);
        } else {
          notifyTransaction(hash, "error", "Transaction failed");
        }
      }

      return hash;
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      notifyError("Enter Contest Failed", error?.message || "Unknown error");
    }
  });

  const requestReveal = useMutation({
    mutationFn: async () => {
      if (contestId === 0) throw new Error("Contest not ready");
      const hash = await writeContractAsync({
        address: LUMEN_PRICE_ARENA_ADDRESS,
        abi: LUMEN_PRICE_ARENA_ABI,
        functionName: "requestRangeReveal",
        args: [BigInt(contestId)]
      });

      notifyTransaction(hash, "pending", "Requesting reveal...");

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          notifyTransaction(hash, "success", "Reveal requested successfully");
        } else {
          notifyTransaction(hash, "error", "Transaction failed");
        }
      }

      return hash;
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      notifyError("Request Reveal Failed", error?.message || "Unknown error");
    }
  });

  const submitReveal = useMutation({
    mutationFn: async () => {
      if (contestId === 0) throw new Error("Contest not ready");
      if (!publicClient) throw new Error("Public client not available");
      const handles = (await publicClient.readContract({
        address: LUMEN_PRICE_ARENA_ADDRESS,
        abi: LUMEN_PRICE_ARENA_ABI,
        functionName: "getPendingRevealHandles",
        args: [BigInt(contestId)]
      })) as `0x${string}`[];
      if (!handles || handles.length === 0) throw new Error("No pending handles");
      const { clearDirections, decryptionProof } = await decryptDirections(handles);
      const hash = await writeContractAsync({
        address: LUMEN_PRICE_ARENA_ADDRESS,
        abi: LUMEN_PRICE_ARENA_ABI,
        functionName: "submitRangeReveal",
        args: [BigInt(contestId), clearDirections, decryptionProof]
      });

      notifyTransaction(hash, "pending", "Submitting reveal...");

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          notifyTransaction(hash, "success", "Reveal submitted successfully");
        } else {
          notifyTransaction(hash, "error", "Transaction failed");
        }
      }

      return hash;
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      notifyError("Submit Reveal Failed", error?.message || "Unknown error");
    }
  });

  const settleContest = useMutation({
    mutationFn: async () => {
      if (contestId === 0) throw new Error("Contest not ready");
      const hash = await writeContractAsync({
        address: LUMEN_PRICE_ARENA_ADDRESS,
        abi: LUMEN_PRICE_ARENA_ABI,
        functionName: "settleContest",
        args: [BigInt(contestId)]
      });

      notifyTransaction(hash, "pending", "Settling contest...");

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          notifyTransaction(hash, "success", "Contest settled successfully");
        } else {
          notifyTransaction(hash, "error", "Transaction failed");
        }
      }

      return hash;
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      notifyError("Settle Contest Failed", error?.message || "Unknown error");
    }
  });

  const claimPrize = useMutation({
    mutationFn: async () => {
      if (contestId === 0) throw new Error("Contest not ready");
      const hash = await writeContractAsync({
        address: LUMEN_PRICE_ARENA_ADDRESS,
        abi: LUMEN_PRICE_ARENA_ABI,
        functionName: "claimPrize",
        args: [BigInt(contestId)]
      });

      notifyTransaction(hash, "pending", "Claiming prize...");

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          notifyTransaction(hash, "success", "Prize claimed successfully!");
        } else {
          notifyTransaction(hash, "error", "Transaction failed");
        }
      }

      return hash;
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      notifyError("Claim Prize Failed", error?.message || "Unknown error");
    }
  });

  return {
    entryFee,
    contest,
    rangeBounds,
    rangeStats,
    playerStatus,
    latestContestId: contestId,
    currentPrice,
    enterContest,
    requestReveal,
    submitReveal,
    settleContest,
    claimPrize
  };
}

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { LUMEN_PRICE_ARENA_ADDRESS, LUMEN_PRICE_ARENA_ABI } from "@/constants/contracts";

interface BetRecord {
  contestId: number;
  entered: boolean;
  won: boolean;
  claimed: boolean;
  prizePool: string;
  settled: boolean;
  lockTime: number;
  settleTime: number;
  winningRange: number;
  rolledOver: boolean;
}

export function useMyBetsHistory(latestContestId: number) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [history, setHistory] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !publicClient || latestContestId === 0) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const records: BetRecord[] = [];

        // Fetch last 10 contests
        const startId = Math.max(1, latestContestId - 9);

        for (let contestId = latestContestId; contestId >= startId; contestId--) {
          try {
            // Get player status
            const playerStatus = await publicClient.readContract({
              address: LUMEN_PRICE_ARENA_ADDRESS,
              abi: LUMEN_PRICE_ARENA_ABI,
              functionName: "getPlayerStatus",
              args: [BigInt(contestId), address]
            }) as readonly [boolean, boolean, boolean];

            // Only include if player entered this contest
            if (playerStatus[0]) {
              // Get contest details
              const contestData = await publicClient.readContract({
                address: LUMEN_PRICE_ARENA_ADDRESS,
                abi: LUMEN_PRICE_ARENA_ABI,
                functionName: "getContest",
                args: [BigInt(contestId)]
              }) as readonly [bigint, bigint, bigint, bigint, boolean, boolean, boolean, number];

              records.push({
                contestId,
                entered: playerStatus[0],
                won: playerStatus[1],
                claimed: playerStatus[2],
                prizePool: formatEther(contestData[3]),
                settled: contestData[5],
                lockTime: Number(contestData[1]),
                settleTime: Number(contestData[2]),
                winningRange: contestData[7],
                rolledOver: contestData[6]
              });
            }
          } catch (err) {
            console.log(`Contest #${contestId} not found or error:`, err);
            // Contest might not exist yet, continue
          }
        }

        setHistory(records);
      } catch (error) {
        console.error("Failed to fetch bet history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [address, publicClient, latestContestId]);

  return { history, loading };
}

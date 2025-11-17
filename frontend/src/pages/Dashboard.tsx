import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "viem";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePriceArena } from "@/hooks/usePriceArena";
import { LiveChart } from "@/components/LiveChart";

function formatBps(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

export const Dashboard = () => {
  const [selectedDirection, setSelectedDirection] = useState<0 | 1 | null>(null);
  const {
    entryFee,
    contest,
    rangeBounds,
    rangeStats,
    playerStatus,
    enterContest,
    requestReveal,
    submitReveal,
    settleContest,
    claimPrize
  } = usePriceArena();

  const prizePool = contest ? Number(formatEther(contest.prizePoolWei)) : 0;
  const totalEntrants = useMemo(
    () => rangeStats?.reduce((sum, stat) => sum + Number(stat?.entrants ?? 0n), 0) ?? 0,
    [rangeStats]
  );

  const nowSeconds = Math.floor(Date.now() / 1000);
  const contestOpen = contest ? nowSeconds < contest.lockTime && !contest.settled : false;
  const hasEntered = Boolean(playerStatus?.[0]);
  const isWinner = Boolean(playerStatus?.[1]);
  const hasClaimed = Boolean(playerStatus?.[2]);
  const canRequestReveal =
    contest ? nowSeconds >= contest.lockTime && !contest.exposuresReady && contest.prizePoolWei > 0n : false;
  const canSubmitReveal =
    contest ? nowSeconds >= contest.lockTime && !contest.exposuresReady && contest.prizePoolWei > 0n : false;
  const canSettle = contest ? contest.exposuresReady && !contest.settled && nowSeconds >= contest.settleTime : false;
  const canClaim = contest ? contest.settled && !contest.rolledOver && isWinner && !hasClaimed : false;

  const ranges = useMemo(() => {
    if (!rangeBounds || rangeBounds.length < 2) return [];
    return rangeBounds.slice(0, -1).map((lower, idx) => {
      const upper = rangeBounds[idx + 1];
      const stat = rangeStats?.[idx];
      return {
        index: idx,
        label: `${formatBps(lower)} → ${formatBps(upper)}`,
        entrants: Number(stat?.entrants ?? 0n),
        revealed: stat ? Number(stat.revealedExposure) : undefined,
        isWinning: contest?.settled ? contest.winningRange === idx : false,
        directionLabel: idx === 0 ? "Bearish (Down)" : "Bullish (Up)"
      };
    });
  }, [contest?.settled, contest?.winningRange, rangeBounds, rangeStats]);

  const lockLabel = contest ? formatDistanceToNow(contest.lockTime * 1000, { addSuffix: true }) : "--";
  const settleLabel = contest ? formatDistanceToNow(contest.settleTime * 1000, { addSuffix: true }) : "--";

  const enterDisabled = selectedDirection === null || enterContest.isPending || !contestOpen || hasEntered;
  const enterDisabledLabel = !contest
    ? "Loading new contest round"
    : !contestOpen
      ? "Contest locked, waiting for next round"
      : hasEntered
        ? "You have already entered this round"
        : selectedDirection === null
          ? "Please select Up or Down direction"
          : "";

  const handleSubmit = async () => {
    if (selectedDirection === null || enterDisabled) return;
    await enterContest.mutateAsync({ predictUp: selectedDirection === 1 });
    setSelectedDirection(null);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Contest" value={contest ? `#${contest.contestId}` : "--"} subtitle="7-day auto rotation" />
        <StatCard title="Entry Fee" value={entryFee ? `${entryFee} ETH` : "--"} subtitle="Fixed entry fee" />
        <StatCard title="Prize Pool" value={`${prizePool.toFixed(4)} ETH`} subtitle="Total accumulated" />
        <StatCard title="Total Entrants" value={totalEntrants ? `${totalEntrants}` : "--"} subtitle="All directions" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <LiveChart />

          <Card className="p-4 bg-black/30 border-white/10">
            <StatCard
              title="Phase"
              value={
                contest
                  ? contest.settled
                    ? "Settled"
                    : contestOpen
                      ? `Open - Locks ${lockLabel}`
                      : "Locked - Awaiting reveal/settlement"
                  : "--"
              }
              subtitle={contest ? `Expected settlement ${settleLabel}` : "Waiting for contract data"}
            />
          </Card>
        </div>

        <Card className="p-6 bg-white/5 border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Choose Direction: Up / Down</h2>
          <div className="grid gap-4">
            {ranges.map((range) => {
              const isSelected = selectedDirection === range.index;
              const isWinning = Boolean(range.isWinning);
              return (
                <button
                  key={range.index}
                  onClick={() => setSelectedDirection(range.index as 0 | 1)}
                  className={`flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${isWinning
                      ? "border-cyan-400 bg-cyan-400/20 text-white shadow-lg shadow-cyan-400/30"
                      : isSelected
                        ? "border-neon-green bg-neon-green/25 text-white shadow-lg shadow-neon-green/40 scale-[1.02]"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                    }`}
                >
                  <div>
                    <p className={`font-bold text-lg ${isSelected ? "text-neon-green" : ""}`}>
                      {range.directionLabel} {isWinning ? "• Winning" : ""}
                      {isSelected && <span className="ml-2 text-neon-green">✓ Selected</span>}
                    </p>
                    <p className={`text-sm mt-1 ${isSelected ? "text-white/80" : "text-white/60"}`}>{range.label}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className={isSelected ? "text-white/80 font-semibold" : "text-white/60"}>Entrants: {range.entrants}</p>
                    {range.revealed !== undefined && contest?.exposuresReady && (
                      <p className="text-white/40">Exposure: {range.revealed}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <Button onClick={handleSubmit} disabled={enterDisabled} className="h-12 px-8 md:w-64">
              {enterContest.isPending ? "Submitting..." : "Submit Prediction"}
            </Button>
          </div>

          {playerStatus && (
            <p className="mt-4 text-sm text-white/60">
              Status: {playerStatus[0] ? "Entered" : "Not entered"} • {playerStatus[1] ? "Winner" : "Pending"} • {playerStatus[2] ? "Claimed" : "Unclaimed"}
            </p>
          )}
          {enterDisabledLabel && <p className="text-xs text-white/40 mt-1">{enterDisabledLabel}</p>}
        </Card>
      </div>

      <Card className="p-6 bg-black/30 border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">On-Chain Operations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <OperationButton
            label="Request Reveal"
            description="Generate public decryption handle"
            onClick={() => requestReveal.mutate()}
            loading={requestReveal.isPending}
            disabled={!canRequestReveal}
          />
          <OperationButton
            label="Submit Reveal"
            description="Upload decrypted direction counts"
            onClick={() => submitReveal.mutate()}
            loading={submitReveal.isPending}
            disabled={!canSubmitReveal}
          />
          <OperationButton
            label="Settle Contest"
            description="Fetch oracle price and settle"
            onClick={() => settleContest.mutate()}
            loading={settleContest.isPending}
            disabled={!canSettle}
          />
          <OperationButton
            label="Claim Prize"
            description="Winners claim their rewards"
            onClick={() => claimPrize.mutate()}
            loading={claimPrize.isPending}
            disabled={!canClaim}
          />
        </div>
      </Card>
    </div>
  );
};

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="p-4 bg-black/40 border-white/10">
      <p className="text-sm text-white/60">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-white/40 mt-1">{subtitle}</p>
    </Card>
  );
}

function OperationButton({
  label,
  description,
  onClick,
  loading,
  disabled
}: {
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant="outline"
      className="h-full flex flex-col items-start text-left gap-1 bg-white/5 border-white/20 disabled:opacity-40"
    >
      <span className="font-semibold text-white">{loading ? `${label}...` : label}</span>
      <span className="text-xs text-white/60">{description}</span>
    </Button>
  );
}

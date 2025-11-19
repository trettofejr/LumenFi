import { format, formatDistanceToNow } from "date-fns";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { usePriceArena } from "@/hooks/usePriceArena";
import { useMyBetsHistory } from "@/hooks/useMyBetsHistory";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

function formatBps(value: number) {
  return `${(value / 100).toFixed(2)}%`;
}

export const MyBets = () => {
  const { address } = useAccount();
  const { contest, rangeBounds, rangeStats, playerStatus, entryFee, latestContestId } = usePriceArena();
  const { history, loading: historyLoading } = useMyBetsHistory(latestContestId);

  const totalEntrants = rangeStats?.reduce((sum, stat) => sum + Number(stat?.entrants ?? 0n), 0) ?? 0;
  const prizePool = contest ? Number(formatEther(contest.prizePoolWei)) : 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const locked = contest ? nowSeconds >= contest.lockTime : false;
  const settled = Boolean(contest?.settled);
  const exposuresReady = Boolean(contest?.exposuresReady);
  const rolledOver = Boolean(contest?.rolledOver);

  const ranges =
    rangeBounds && rangeBounds.length > 1
      ? rangeBounds.slice(0, -1).map((lower, idx) => {
          const upper = rangeBounds[idx + 1];
          const stat = rangeStats?.[idx];
          const entrants = Number(stat?.entrants ?? 0n);
          const exposure = stat ? Number(stat.revealedExposure) : undefined;
          const isWinning = contest?.settled ? contest.winningRange === idx : false;
          return {
            idx,
            label: `${formatBps(lower)} → ${formatBps(upper)}`,
            entrants,
            exposure,
            isWinning,
            directionLabel: idx === 0 ? "Bearish (Down)" : "Bullish (Up)"
          };
        })
      : [];

  return (
    <div className="space-y-8">
      <Card className="p-6 bg-black/40 border-white/5">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/60">Current Round</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Contest #{contest ? contest.contestId : latestContestId}</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm text-white/70 mt-4">
            <InfoItem label="Entry Fee" value={entryFee ? `${entryFee} ETH` : "--"} />
            <InfoItem label="Prize Pool" value={`${prizePool.toFixed(4)} ETH`} />
            <InfoItem
              label="Lock Time"
              value={
                contest
                  ? `${format(new Date(contest.lockTime * 1000), "MM-dd HH:mm")} (${formatDistanceToNow(
                      contest.lockTime * 1000,
                      { addSuffix: true }
                    )})`
                  : "--"
              }
            />
            <InfoItem
              label="Settlement Time"
              value={
                contest
                  ? `${format(new Date(contest.settleTime * 1000), "MM-dd HH:mm")} (${formatDistanceToNow(
                      contest.settleTime * 1000,
                      { addSuffix: true }
                    )})`
                  : "--"
              }
            />
          </div>
          <p className="text-xs text-white/50 mt-2">* Auto-rotating every 7 days (4 days entry + 3 days settlement period).</p>
        </div>
      </Card>

      <Card className="p-6 bg-black/50 border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">My Entry Status</h2>
        {playerStatus ? (
          <div className="grid gap-6 md:grid-cols-3 text-sm text-white/70">
            <StatusBadge label="Entered" active={playerStatus[0]} />
            <StatusBadge label="Winner" active={playerStatus[1]} loading={!settled} />
            <StatusBadge label="Prize Claimed" active={playerStatus[2]} warning={playerStatus[1] && !playerStatus[2]} />
          </div>
        ) : (
          <p className="text-white/50 text-sm">Connect wallet to view your entry status. Encrypted predictions are not exposed, only entry/winner/claim boolean states.</p>
        )}
        <p className="text-xs text-white/40 mt-4 leading-relaxed">
          - Due to fhEVM privacy features, the frontend cannot read your actual predicted range, only check results via <code className="text-white/70">getPlayerStatus</code>.<br />
          - If you won and exposures are revealed, click "Claim Prize" on the Dashboard page to collect your rewards.
        </p>
      </Card>

      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Range Distribution</h2>
            <p className="text-white/50 text-sm">{ranges.length} ranges, {totalEntrants} total entrants.</p>
          </div>
          {contest?.settled && (
            <Badge variant="settled" className="px-4">
              Winning Range #{(contest.winningRange ?? 0) + 1}
            </Badge>
          )}
        </div>
        {ranges.length === 0 ? (
          <p className="text-sm text-white/60">Waiting for contract data...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/60">Direction</TableHead>
                <TableHead className="text-white/60">Range (bps)</TableHead>
                <TableHead className="text-white/60 text-center">Entrants</TableHead>
                <TableHead className="text-white/60 text-center">Exposed Tickets</TableHead>
                <TableHead className="text-white/60 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranges.map((range) => (
                <TableRow key={range.idx} className="border-white/5">
                  <TableCell className="text-white font-semibold">{range.directionLabel}</TableCell>
                  <TableCell className="text-white/70">{range.label}</TableCell>
                  <TableCell className="text-center text-white/80">{range.entrants}</TableCell>
                  <TableCell className="text-center text-white/80">
                    {exposuresReady ? range.exposure ?? 0 : <span className="text-white/40">Pending</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {range.isWinning ? (
                      <Badge variant="settled" className="px-3">Winning</Badge>
                    ) : (
                      <Badge variant={contest?.settled ? "muted" : "locked"} className="px-3">
                        {contest?.settled ? "Not winning" : "In progress"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-6 bg-black/40 border-white/5 space-y-3 text-sm text-white/70">
        <h2 className="text-xl font-semibold text-white">Public Decryption & Settlement Progress</h2>
        <ul className="list-disc list-inside space-y-2 text-white/60">
          <li>
            {locked ? "✅" : "⏳"} Entry Phase: {locked ? "Locked, no new entries allowed" : "Still accepting entries, data not yet public"}.
          </li>
          <li>
            {exposuresReady ? "✅" : "⏳"} Direction Reveal: {exposuresReady ? "All encrypted directions have been decrypted" : "Need to execute Request + Submit Reveal workflow"}.
          </li>
          <li>
            {settled ? (rolledOver ? "⚠️" : "✅") : "⏳"} Settlement Status:
            {settled ? (rolledOver ? "No winners this round, prize pool rolled over" : "Winning range determined via Chainlink oracle") : "Awaiting Chainlink price feed settlement"}.
          </li>
        </ul>
        <p className="text-xs text-white/40">
          Operation Tip: Request/submit reveal can be triggered in Dashboard&nbsp;&gt;&nbsp;On-Chain Operations, corresponding to contract functions <code className="text-white/60">requestRangeReveal</code> and{" "}
          <code className="text-white/60">submitRangeReveal</code>. Public exposure must be ready before calling <code className="text-white/60">settleContest</code>.
        </p>
      </Card>

      <Card className="p-6 bg-white/5 border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">My Bet History</h2>
        {!address ? (
          <p className="text-white/50 text-sm">Connect wallet to view your bet history</p>
        ) : historyLoading ? (
          <p className="text-white/50 text-sm animate-pulse">Loading your bet history...</p>
        ) : history.length === 0 ? (
          <p className="text-white/50 text-sm">No bet history found. Make your first prediction on the Dashboard!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/60">Contest #</TableHead>
                <TableHead className="text-white/60">Lock Time</TableHead>
                <TableHead className="text-white/60">Prize Pool</TableHead>
                <TableHead className="text-white/60 text-center">Winning Range</TableHead>
                <TableHead className="text-white/60 text-center">Result</TableHead>
                <TableHead className="text-white/60 text-center">Claimed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((bet) => (
                <TableRow key={bet.contestId} className="border-white/5">
                  <TableCell className="text-white font-semibold">#{bet.contestId}</TableCell>
                  <TableCell className="text-white/70 text-sm">
                    {format(new Date(bet.lockTime * 1000), "MM-dd HH:mm")}
                  </TableCell>
                  <TableCell className="text-white/70">{parseFloat(bet.prizePool).toFixed(4)} ETH</TableCell>
                  <TableCell className="text-center text-white/80">
                    {bet.settled ? (bet.winningRange === 0 ? "DOWN" : "UP") : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {!bet.settled ? (
                      <Badge variant="locked" className="px-3">Pending</Badge>
                    ) : bet.rolledOver ? (
                      <Badge variant="muted" className="px-3">Rolled Over</Badge>
                    ) : bet.won ? (
                      <Badge variant="open" className="px-3">Won</Badge>
                    ) : (
                      <Badge variant="muted" className="px-3">Lost</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {bet.won && !bet.claimed ? (
                      <Badge variant="push" className="px-3">Unclaimed!</Badge>
                    ) : bet.claimed ? (
                      <Badge variant="settled" className="px-3">Yes</Badge>
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <p className="text-xs uppercase text-white/40 tracking-wide">{label}</p>
      <p className="text-white font-semibold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({
  label,
  active,
  loading,
  warning
}: {
  label: string;
  active: boolean;
  loading?: boolean;
  warning?: boolean;
}) {
  const variant: BadgeProps["variant"] =
    warning && !active ? "push" : active ? "open" : loading ? "muted" : "muted";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-white/50 uppercase tracking-wide">{label}</p>
      <Badge variant={variant} className="w-min px-4 py-1">
        {loading ? "Pending" : active ? "Yes" : "No"}
      </Badge>
    </div>
  );
}

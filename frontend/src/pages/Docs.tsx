import { Card } from "@/components/ui/card";
import { Play, Clock, Lock, Unlock, Trophy, RefreshCw } from "lucide-react";

const gameLogic = [
  {
    icon: Clock,
    title: "Round Duration: 7 Days",
    detail:
      "Each contest runs for exactly 7 days: 4 days for entry phase (players can submit predictions) + 3 days for settlement phase (reveal, settle, claim)."
  },
  {
    icon: Lock,
    title: "Entry Phase (Days 1-4)",
    detail:
      "Players predict whether BTC price will go UP or DOWN. All predictions are encrypted using FHE and remain completely hidden on-chain. Entry fee: 0.001 ETH per prediction."
  },
  {
    icon: Unlock,
    title: "Lock & Reveal Phase (Day 4+)",
    detail:
      "After 4 days, entry phase locks. Anyone can trigger public decryption by calling requestRangeReveal() then submitRangeReveal(). This reveals all encrypted predictions on-chain."
  },
  {
    icon: Trophy,
    title: "Settlement (Day 7+)",
    detail:
      "After 7 days, anyone can call settleContest(). The contract fetches BTC price from Chainlink oracle, compares with starting price to determine UP or DOWN winners, then distributes prize pool equally."
  },
  {
    icon: RefreshCw,
    title: "Auto-Rotation",
    detail:
      "When settled, the contract automatically creates the next round. If no one wins (no entries in winning direction), the prize pool rolls over to the next round. Fully decentralized with no admin control."
  }
];

const timeline = [
  { time: "Day 0", event: "Contest starts, starting BTC price recorded" },
  { time: "Days 1-4", event: "Players submit encrypted predictions (UP/DOWN)" },
  { time: "Day 4", event: "Entry phase locks, no new predictions allowed" },
  { time: "Day 4+", event: "Anyone triggers reveal: requestRangeReveal() → submitRangeReveal()" },
  { time: "Day 7", event: "Settlement time reached" },
  { time: "Day 7+", event: "Anyone calls settleContest() → Winners determined via Chainlink oracle" },
  { time: "After Settlement", event: "Winners claim prizes via claimPrize()" },
  { time: "Immediately", event: "Next round auto-starts with new starting price" }
];

const steps = [
  {
    title: "1. Encrypt Direction & Submit Entry",
    detail:
      "Players select UP (1) or DOWN (0), encrypt their choice using fhEVM SDK, and call enterContest(encryptedDirection, proof). The contract only stores ciphertext, keeping predictions private until lock time."
  },
  {
    title: "2. Lock & Request Direction Reveal",
    detail:
      "After 4 days, anyone calls requestRangeReveal(contestId). The contract marks all encrypted predictions for public decryption using FHE.makePubliclyDecryptable() and returns decryption handles."
  },
  {
    title: "3. Submit Decrypted Directions",
    detail:
      "Using fhEVM SDK, anyone fetches decrypted values and calls submitRangeReveal() with plaintext directions + proof. The contract verifies signatures and counts UP/DOWN exposures."
  },
  {
    title: "4. Settle Contest & Determine Winners",
    detail:
      "After 7 days, anyone calls settleContest(). The contract fetches final BTC price from Chainlink oracle, compares with starting price to determine winning direction (UP if price increased, DOWN if decreased)."
  },
  {
    title: "5. Claim Prize & Auto Start Next Round",
    detail:
      "Winners call claimPrize(contestId) to receive their share of the prize pool. Prize is split equally among winners. If no winners, prize rolls over. The contract automatically starts the next round with fresh starting price."
  }
];

const faq = [
  {
    question: "Why use FHE (Fully Homomorphic Encryption)?",
    answer:
      "Traditional prediction markets expose all bets publicly, enabling front-running and targeted attacks. FHE keeps predictions encrypted on-chain until the reveal phase, ensuring fair play. No one—not even validators—can see predictions before lock time."
  },
  {
    question: "How does the prize pool work?",
    answer:
      "All entry fees accumulate in the prize pool (0.001 ETH per entry). Winners in the correct direction split the pool equally. If no one predicted correctly, the entire pool rolls over to the next round, creating bigger jackpots."
  },
  {
    question: "How is the next round triggered?",
    answer:
      "Fully automatic! When settleContest() is called, the contract immediately calls _createNextContest() internally. The new round starts with a fresh BTC starting price from Chainlink oracle. No admin intervention needed."
  },
  {
    question: "Who can trigger reveal and settlement?",
    answer:
      "Anyone! This is a fully permissionless system. Any user can call requestRangeReveal(), submitRangeReveal(), and settleContest() once the time conditions are met. This ensures the game never gets stuck."
  },
  {
    question: "What prevents cheating during reveal phase?",
    answer:
      "The fhEVM decryption process requires cryptographic proofs. The contract verifies FHE.checkSignatures() to ensure decrypted values match the original encrypted predictions. Tampered data will be rejected on-chain."
  },
  {
    question: "Can I see other players' predictions before lock time?",
    answer:
      "No! Predictions are stored as euint8 ciphertext on-chain. Even if you inspect the contract storage or blockchain data, you only see encrypted values. Predictions are only revealed after requestRangeReveal() is called post-lock."
  }
];

export const Docs = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Demo Video Section */}
      <Card className="p-8 bg-gradient-to-br from-neon-green/10 via-black/40 to-black/40 border-neon-green/20">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-8 h-8 text-neon-green" />
          <h2 className="text-3xl font-bold text-white">Demo Video</h2>
        </div>
        <div className="aspect-video bg-black/60 rounded-xl border border-white/10 overflow-hidden">
          <video
            controls
            className="w-full h-full rounded-xl"
            preload="metadata"
          >
            <source src="/demo_test_bet.mp4" type="video/mp4" />
            <p className="text-white/60 text-center p-8">
              Your browser does not support the video tag. Please download the demo video to watch it.
            </p>
          </video>
        </div>
      </Card>

      <header className="space-y-3">
        <h1 className="text-4xl font-black text-white">Lumen Price Arena Documentation</h1>
        <p className="text-white/60 text-lg leading-relaxed">
          A fully decentralized BTC price prediction game powered by Zama's fhEVM 0.9.1 and Chainlink oracles.
          Players make encrypted UP/DOWN predictions on BTC price movements. Winners share the prize pool.
          <span className="text-neon-green font-semibold"> No admin, no custody, fully on-chain.</span>
        </p>
      </header>

      {/* Game Mechanics */}
      <Card className="p-6 bg-black/40 border-white/5 space-y-6">
        <h2 className="text-2xl font-semibold text-white">How The Game Works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {gameLogic.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                <Icon className="w-6 h-6 text-neon-green flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-bold mb-1">{item.title}</p>
                  <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6 bg-white/5 border-white/10 space-y-4">
        <h2 className="text-2xl font-semibold text-white mb-4">Round Timeline</h2>
        <div className="relative pl-8 space-y-4">
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-neon-green via-neon-green/50 to-transparent" />
          {timeline.map((item, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[26px] w-4 h-4 rounded-full bg-neon-green border-2 border-black" />
              <div className="bg-black/40 p-3 rounded-lg border border-white/10">
                <p className="text-neon-green font-bold text-sm">{item.time}</p>
                <p className="text-white/80 text-sm mt-1">{item.event}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Process Steps */}
      <Card className="p-6 bg-black/50 border-white/5 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Technical Process Overview</h2>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.title} className="border-l-2 border-neon-green/50 pl-4 py-2">
              <p className="text-neon-green font-bold">{step.title}</p>
              <p className="text-white/70 text-sm leading-relaxed mt-1">{step.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Core ABI */}
      <Card className="p-6 bg-white/5 border-white/10 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Core Smart Contract Functions</h2>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-2">
            <li>
              <code className="text-white bg-white/10 px-2 py-0.5 rounded">enterContest(externalEuint8 direction, bytes proof)</code>
              <span className="ml-2">- Submit encrypted prediction with FHE proof</span>
            </li>
            <li>
              <code className="text-white bg-white/10 px-2 py-0.5 rounded">requestRangeReveal(uint64 contestId)</code>
              <span className="ml-2">- Trigger public decryption after lock time</span>
            </li>
            <li>
              <code className="text-white bg-white/10 px-2 py-0.5 rounded">submitRangeReveal(uint64 contestId, bytes abiEncodedDirections, bytes proof)</code>
              <span className="ml-2">- Submit decrypted predictions with proof</span>
            </li>
            <li>
              <code className="text-white bg-white/10 px-2 py-0.5 rounded">settleContest(uint64 contestId)</code>
              <span className="ml-2">- Fetch oracle price and determine winners</span>
            </li>
            <li>
              <code className="text-white bg-white/10 px-2 py-0.5 rounded">claimPrize(uint64 contestId)</code>
              <span className="ml-2">- Winners claim their share of prize pool</span>
            </li>
          </ul>
        </div>
        <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs text-white/70 overflow-auto">
          <p className="text-white/90 mb-2">// View Functions:</p>
          <pre className="whitespace-pre-wrap text-white/60">
{`getContest(uint64 contestId) → (startTime, lockTime, settleTime, prizePool, ...)
getRangeBounds(uint64 contestId) → int256[] bounds
getRangeStats(uint64 contestId) → (entrants, revealedExposure per range)
getPlayerStatus(uint64 contestId, address player) → (entered, won, claimed)`}
          </pre>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-6 bg-black/40 border-white/5 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <div key={item.question} className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-white font-semibold mb-2">{item.question}</p>
              <p className="text-white/70 text-sm leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tech Stack */}
      <Card className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10">
        <h2 className="text-2xl font-semibold text-white mb-4">Technology Stack</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-neon-green font-semibold">Blockchain</p>
            <ul className="text-white/70 space-y-1 list-disc list-inside">
              <li>Ethereum Sepolia Testnet</li>
              <li>Solidity 0.8.24</li>
              <li>Hardhat Development Framework</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-neon-green font-semibold">Privacy & Oracles</p>
            <ul className="text-white/70 space-y-1 list-disc list-inside">
              <li>Zama fhEVM 0.9.1 (Fully Homomorphic Encryption)</li>
              <li>Chainlink Price Feeds (BTC/USD)</li>
              <li>FHE Public Decryption Protocol</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-neon-green font-semibold">Frontend</p>
            <ul className="text-white/70 space-y-1 list-disc list-inside">
              <li>React 18 + TypeScript</li>
              <li>Vite 5.4 Build Tool</li>
              <li>TailwindCSS + Shadcn UI</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-neon-green font-semibold">Web3 Integration</p>
            <ul className="text-white/70 space-y-1 list-disc list-inside">
              <li>Wagmi 2.9 + Viem</li>
              <li>RainbowKit 2.1 (Wallet Connection)</li>
              <li>TanStack Query (State Management)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

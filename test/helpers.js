const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Test Helper Utilities for LumenPriceArena
 */

/**
 * Deploy a fresh LumenPriceArena contract with mock oracle
 * @param {string} entryFee - Entry fee in wei (default: 0.00035 ETH)
 * @param {number} initialPrice - Initial BTC price (default: $50,000)
 * @returns {Object} { lumenPriceArena, mockOracle }
 */
async function deployContract(
  entryFee = ethers.parseEther("0.00035"),
  initialPrice = 50000
) {
  const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
  const mockOracle = await MockAggregator.deploy(
    8,
    ethers.parseUnits(initialPrice.toString(), 8)
  );
  await mockOracle.waitForDeployment();

  const LumenPriceArena = await ethers.getContractFactory("LumenPriceArena");
  const lumenPriceArena = await LumenPriceArena.deploy(
    entryFee,
    await mockOracle.getAddress()
  );
  await lumenPriceArena.waitForDeployment();

  return { lumenPriceArena, mockOracle };
}

/**
 * Fast forward to a specific phase of the contest
 * @param {Object} contest - Contest object from getContest()
 * @param {string} phase - Phase to jump to: 'entry', 'lock', 'reveal', 'settle'
 */
async function jumpToPhase(contest, phase) {
  const now = BigInt(await time.latest());

  switch (phase) {
    case "entry":
      // Already in entry phase if current time < lockTime
      if (now >= contest.lockTime) {
        throw new Error("Already past entry phase");
      }
      break;

    case "lock":
      // Jump to lock time
      await time.increaseTo(contest.lockTime);
      break;

    case "reveal":
      // Jump to 1 second after lock (reveal can start immediately after lock)
      await time.increaseTo(contest.lockTime + BigInt(1));
      break;

    case "settle":
      // Jump to settle time
      await time.increaseTo(contest.settleTime);
      break;

    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}

/**
 * Calculate expected price change in basis points
 * @param {number} startPrice - Starting price
 * @param {number} endPrice - Ending price
 * @returns {number} Price change in basis points (1 bp = 0.01%)
 */
function calculatePriceChangeBps(startPrice, endPrice) {
  return Math.floor(((endPrice - startPrice) / startPrice) * 10000);
}

/**
 * Determine winning direction based on price change
 * @param {number} startPrice - Starting price
 * @param {number} endPrice - Ending price
 * @returns {number} 0 for DOWN, 1 for UP
 */
function determineWinningDirection(startPrice, endPrice) {
  return endPrice >= startPrice ? 1 : 0;
}

/**
 * Format contest data for logging
 * @param {Object} contest - Contest object from getContest()
 * @returns {Object} Formatted contest info
 */
function formatContest(contest) {
  return {
    startTime: new Date(Number(contest.startTime) * 1000).toISOString(),
    lockTime: new Date(Number(contest.lockTime) * 1000).toISOString(),
    settleTime: new Date(Number(contest.settleTime) * 1000).toISOString(),
    prizePool: ethers.formatEther(contest.prizePool) + " ETH",
    directionsReady: contest.directionsReady,
    settled: contest.settled,
    rolled: contest.rolled,
    winningRange: contest.winningRange,
  };
}

/**
 * Generate test accounts
 * @param {number} count - Number of accounts to generate
 * @returns {Array} Array of signer objects
 */
async function getTestAccounts(count = 5) {
  const signers = await ethers.getSigners();
  return signers.slice(0, count);
}

/**
 * Create a mock encrypted direction (for testing without FHE)
 * Note: In production, use fhEVM SDK for proper encryption
 * @param {number} direction - 0 for DOWN, 1 for UP
 * @returns {Object} { encryptedDirection, proof }
 */
function mockEncryptDirection(direction) {
  // This is a placeholder - real implementation requires fhEVM SDK
  const encryptedDirection = ethers.hexlify(ethers.randomBytes(32));
  const proof = ethers.hexlify(ethers.randomBytes(64));

  return {
    encryptedDirection,
    proof,
    plaintextDirection: direction,
  };
}

/**
 * Calculate expected prize per winner
 * @param {bigint} prizePool - Total prize pool in wei
 * @param {number} winnerCount - Number of winners
 * @returns {bigint} Prize per winner in wei
 */
function calculatePrizePerWinner(prizePool, winnerCount) {
  if (winnerCount === 0) return BigInt(0);
  return prizePool / BigInt(winnerCount);
}

/**
 * Simulate multiple rounds
 * @param {Object} contract - LumenPriceArena contract instance
 * @param {number} rounds - Number of rounds to simulate
 * @returns {Array} Array of settled contest IDs
 */
async function simulateRounds(contract, rounds = 3) {
  const settledContests = [];

  for (let i = 0; i < rounds; i++) {
    const contestId = await contract.latestContestId();
    const contest = await contract.getContest(contestId);

    await time.increaseTo(contest.settleTime + BigInt(1));
    await contract.settleContest(contestId);

    settledContests.push(contestId);
  }

  return settledContests;
}

/**
 * Get contest phase based on current time
 * @param {Object} contest - Contest object from getContest()
 * @returns {string} Current phase: 'entry', 'locked', 'settleable', 'settled'
 */
async function getContestPhase(contest) {
  if (contest.settled) return "settled";

  const now = BigInt(await time.latest());

  if (now < contest.lockTime) return "entry";
  if (now < contest.settleTime) return "locked";
  return "settleable";
}

/**
 * Wait for specific number of blocks
 * @param {number} blocks - Number of blocks to wait
 */
async function mineBlocks(blocks = 1) {
  for (let i = 0; i < blocks; i++) {
    await time.increase(15); // Assume 15 second block time
  }
}

/**
 * Estimate gas for a transaction
 * @param {Object} contract - Contract instance
 * @param {string} method - Method name
 * @param {Array} args - Method arguments
 * @returns {bigint} Estimated gas
 */
async function estimateGas(contract, method, args = []) {
  return await contract[method].estimateGas(...args);
}

/**
 * Generate random price within range
 * @param {number} min - Minimum price
 * @param {number} max - Maximum price
 * @returns {number} Random price
 */
function randomPrice(min = 30000, max = 70000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create price volatility scenario
 * @param {number} basePrice - Starting base price
 * @param {number} volatility - Volatility percentage (e.g., 20 for ±20%)
 * @param {number} steps - Number of price points
 * @returns {Array} Array of prices
 */
function generateVolatilePrices(basePrice = 50000, volatility = 20, steps = 5) {
  const prices = [basePrice];
  let currentPrice = basePrice;

  for (let i = 0; i < steps - 1; i++) {
    const change = (Math.random() * 2 - 1) * (volatility / 100);
    currentPrice = Math.floor(currentPrice * (1 + change));
    prices.push(currentPrice);
  }

  return prices;
}

/**
 * Assert contest state matches expected values
 * @param {Object} contest - Contest object
 * @param {Object} expected - Expected values
 */
function assertContestState(contest, expected) {
  if (expected.settled !== undefined) {
    expect(contest.settled).to.equal(expected.settled);
  }
  if (expected.directionsReady !== undefined) {
    expect(contest.directionsReady).to.equal(expected.directionsReady);
  }
  if (expected.prizePool !== undefined) {
    expect(contest.prizePool).to.equal(expected.prizePool);
  }
  if (expected.rolled !== undefined) {
    expect(contest.rolled).to.equal(expected.rolled);
  }
}

/**
 * Get time remaining until phase
 * @param {Object} contest - Contest object
 * @param {string} phase - Phase to check: 'lock', 'settle'
 * @returns {bigint} Seconds remaining
 */
async function timeUntilPhase(contest, phase) {
  const now = BigInt(await time.latest());
  const targetTime = phase === "lock" ? contest.lockTime : contest.settleTime;

  return targetTime > now ? targetTime - now : BigInt(0);
}

/**
 * Snapshot and restore blockchain state
 * Useful for isolated test scenarios
 */
async function createSnapshot() {
  return await ethers.provider.send("evm_snapshot", []);
}

async function restoreSnapshot(snapshotId) {
  await ethers.provider.send("evm_revert", [snapshotId]);
}

/**
 * Get formatted timestamp for logging
 * @param {bigint} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString();
}

module.exports = {
  deployContract,
  jumpToPhase,
  calculatePriceChangeBps,
  determineWinningDirection,
  formatContest,
  getTestAccounts,
  mockEncryptDirection,
  calculatePrizePerWinner,
  simulateRounds,
  getContestPhase,
  mineBlocks,
  estimateGas,
  randomPrice,
  generateVolatilePrices,
  assertContestState,
  timeUntilPhase,
  createSnapshot,
  restoreSnapshot,
  formatTimestamp,
};

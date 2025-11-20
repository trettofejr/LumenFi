const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LumenPriceArena - Integration Tests", function () {
  let lumenPriceArena;
  let mockOracle;
  let owner, player1, player2, player3, player4;
  const ENTRY_FEE = ethers.parseEther("0.00035");
  const ROUND_DURATION = 7 * 24 * 60 * 60;
  const LOCK_DURATION = 4 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, player1, player2, player3, player4] = await ethers.getSigners();

    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockOracle = await MockAggregator.deploy(8, ethers.parseUnits("50000", 8));
    await mockOracle.waitForDeployment();

    const LumenPriceArena = await ethers.getContractFactory("LumenPriceArena");
    lumenPriceArena = await LumenPriceArena.deploy(
      ENTRY_FEE,
      await mockOracle.getAddress()
    );
    await lumenPriceArena.waitForDeployment();
  });

  describe("Full Round Lifecycle - No Winners Scenario", function () {
    it("Should handle complete round with rollover", async function () {
      const contestId = await lumenPriceArena.latestContestId();
      const contest = await lumenPriceArena.getContest(contestId);

      // Fast forward to settlement time
      await time.increaseTo(contest.settleTime + BigInt(1));

      // Settle with no entries
      const tx = await lumenPriceArena.settleContest(contestId);
      await expect(tx)
        .to.emit(lumenPriceArena, "ContestSettled")
        .withArgs(contestId, 0, 0, true);

      // Verify contest is settled and rolled over
      const settledContest = await lumenPriceArena.getContest(contestId);
      expect(settledContest.settled).to.be.true;
      expect(settledContest.rolled).to.be.true;

      // Verify next contest was created
      const newContestId = await lumenPriceArena.latestContestId();
      expect(newContestId).to.equal(BigInt(contestId) + BigInt(1));
    });
  });

  describe("Multiple Rounds Lifecycle", function () {
    it("Should create multiple consecutive rounds", async function () {
      // Settle first round
      let contest = await lumenPriceArena.getContest(1);
      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      // Settle second round
      contest = await lumenPriceArena.getContest(2);
      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(2);

      // Settle third round
      contest = await lumenPriceArena.getContest(3);
      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(3);

      // Should now be on contest 4
      expect(await lumenPriceArena.latestContestId()).to.equal(4);
    });

    it("Should maintain independent state for each contest", async function () {
      // Get first contest
      const contest1 = await lumenPriceArena.getContest(1);

      // Settle and move to next
      await time.increaseTo(contest1.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      const contest2 = await lumenPriceArena.getContest(2);

      // Verify different start times
      expect(contest2.startTime).to.be.gt(contest1.startTime);

      // Verify first contest is settled, second is not
      const settled1 = await lumenPriceArena.getContest(1);
      const settled2 = await lumenPriceArena.getContest(2);

      expect(settled1.settled).to.be.true;
      expect(settled2.settled).to.be.false;
    });
  });

  describe("Oracle Price Changes", function () {
    it("Should handle positive price change", async function () {
      const contestId = await lumenPriceArena.latestContestId();
      const contest = await lumenPriceArena.getContest(contestId);

      // Price increases from $50,000 to $55,000 (+10%)
      await mockOracle.updatePrice(ethers.parseUnits("55000", 8));

      await time.increaseTo(contest.settleTime + BigInt(1));

      // Settlement should determine UP as winning direction
      await lumenPriceArena.settleContest(contestId);

      const settledContest = await lumenPriceArena.getContest(contestId);
      // Note: Without entries, it will rollover
      expect(settledContest.settled).to.be.true;
    });

    it("Should handle negative price change", async function () {
      const contestId = await lumenPriceArena.latestContestId();
      const contest = await lumenPriceArena.getContest(contestId);

      // Price decreases from $50,000 to $45,000 (-10%)
      await mockOracle.updatePrice(ethers.parseUnits("45000", 8));

      await time.increaseTo(contest.settleTime + BigInt(1));

      await lumenPriceArena.settleContest(contestId);

      const settledContest = await lumenPriceArena.getContest(contestId);
      expect(settledContest.settled).to.be.true;
    });

    it("Should handle minimal price change", async function () {
      const contestId = await lumenPriceArena.latestContestId();
      const contest = await lumenPriceArena.getContest(contestId);

      // Price changes slightly: $50,000 to $50,010 (+0.02%)
      await mockOracle.updatePrice(ethers.parseUnits("50010", 8));

      await time.increaseTo(contest.settleTime + BigInt(1));

      await lumenPriceArena.settleContest(contestId);

      const settledContest = await lumenPriceArena.getContest(contestId);
      expect(settledContest.settled).to.be.true;
    });
  });

  describe("Time Boundary Tests", function () {
    it("Should enforce entry deadline strictly", async function () {
      const contest = await lumenPriceArena.getContest(1);

      // 1 second before lock time - should work (but we skip FHE test)
      await time.increaseTo(contest.lockTime - BigInt(1));
      // Entry would succeed here with proper FHE setup

      // Exactly at lock time - should fail
      await time.increaseTo(contest.lockTime);
      await expect(
        lumenPriceArena.connect(player1).enterContest("0x00", "0x", {
          value: ENTRY_FEE,
        })
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");
    });

    it("Should enforce settlement deadline", async function () {
      const contest = await lumenPriceArena.getContest(1);

      // Before settle time
      await time.increaseTo(contest.settleTime - BigInt(1));
      await expect(
        lumenPriceArena.settleContest(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");

      // At settle time
      await time.increaseTo(contest.settleTime);
      await expect(lumenPriceArena.settleContest(1)).to.emit(
        lumenPriceArena,
        "ContestSettled"
      );
    });

    it("Should calculate correct time windows", async function () {
      const contest = await lumenPriceArena.getContest(1);

      const entryWindow = contest.lockTime - contest.startTime;
      const settlementWindow = contest.settleTime - contest.startTime;

      expect(entryWindow).to.equal(BigInt(LOCK_DURATION));
      expect(settlementWindow).to.equal(BigInt(ROUND_DURATION));
    });
  });

  describe("View Function Accuracy", function () {
    it("Should return accurate contest state throughout lifecycle", async function () {
      // Initial state
      let contest = await lumenPriceArena.getContest(1);
      expect(contest.settled).to.be.false;
      expect(contest.directionsReady).to.be.false;
      expect(contest.prizePool).to.equal(0);

      // After settlement
      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      contest = await lumenPriceArena.getContest(1);
      expect(contest.settled).to.be.true;
    });

    it("Should track player status correctly", async function () {
      const status = await lumenPriceArena.getPlayerStatus(1, player1.address);

      expect(status.entered).to.be.false;
      expect(status.won).to.be.false;
      expect(status.claimed).to.be.false;
    });

    it("Should return accurate range statistics", async function () {
      const stats = await lumenPriceArena.getRangeStats(1);

      expect(stats).to.have.lengthOf(2);
      stats.forEach((stat) => {
        expect(stat.revealedExposure).to.equal(0);
        expect(stat.entrants).to.equal(0);
      });
    });
  });

  describe("Contract State Consistency", function () {
    it("Should maintain consistent state after multiple operations", async function () {
      const initialContestId = await lumenPriceArena.latestContestId();

      // Perform multiple settlements
      for (let i = 0; i < 3; i++) {
        const contestId = await lumenPriceArena.latestContestId();
        const contest = await lumenPriceArena.getContest(contestId);

        await time.increaseTo(contest.settleTime + BigInt(1));
        await lumenPriceArena.settleContest(contestId);
      }

      const finalContestId = await lumenPriceArena.latestContestId();
      expect(finalContestId).to.equal(initialContestId + BigInt(3));
    });

    it("Should handle rapid successive settlements", async function () {
      // Settle contest 1
      let contest = await lumenPriceArena.getContest(1);
      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      // Immediately settle contest 2
      contest = await lumenPriceArena.getContest(2);
      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(2);

      // Verify both are settled
      const c1 = await lumenPriceArena.getContest(1);
      const c2 = await lumenPriceArena.getContest(2);

      expect(c1.settled).to.be.true;
      expect(c2.settled).to.be.true;
    });
  });

  describe("Gas Consumption Analysis", function () {
    it("Should measure gas for settlement", async function () {
      const contest = await lumenPriceArena.getContest(1);
      await time.increaseTo(contest.settleTime + BigInt(1));

      const tx = await lumenPriceArena.settleContest(1);
      const receipt = await tx.wait();

      console.log(`    Gas used for settlement: ${receipt.gasUsed}`);
      expect(receipt.gasUsed).to.be.gt(0);
    });

    it("Should measure gas for view functions", async function () {
      // View functions don't consume gas on-chain, but we can estimate
      const gas = await lumenPriceArena.getContest.estimateGas(1);
      console.log(`    Estimated gas for getContest: ${gas}`);
    });
  });

  describe("Error Handling", function () {
    it("Should revert on invalid contest ID", async function () {
      await expect(
        lumenPriceArena.getContest(999)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestMissing");

      await expect(
        lumenPriceArena.settleContest(999)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestMissing");
    });

    it("Should revert on double settlement", async function () {
      const contest = await lumenPriceArena.getContest(1);
      await time.increaseTo(contest.settleTime + BigInt(1));

      await lumenPriceArena.settleContest(1);

      // Try to settle again
      await expect(
        lumenPriceArena.settleContest(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");
    });

    it("Should handle zero entry fee scenario", async function () {
      // Entry fee is set at deployment, can't be zero due to MIN_ENTRY_FEE check
      const minFee = await lumenPriceArena.MIN_ENTRY_FEE();
      expect(minFee).to.be.gt(0);
    });
  });

  describe("Stress Tests", function () {
    it("Should handle 10 consecutive rounds", async function () {
      this.timeout(60000); // Increase timeout for long test

      for (let i = 1; i <= 10; i++) {
        const contestId = await lumenPriceArena.latestContestId();
        expect(contestId).to.equal(i);

        const contest = await lumenPriceArena.getContest(contestId);
        await time.increaseTo(contest.settleTime + BigInt(1));
        await lumenPriceArena.settleContest(contestId);
      }

      expect(await lumenPriceArena.latestContestId()).to.equal(11);
    });

    it("Should handle extreme price volatility", async function () {
      const prices = [
        ethers.parseUnits("50000", 8),
        ethers.parseUnits("100000", 8), // +100%
        ethers.parseUnits("25000", 8), // -75%
        ethers.parseUnits("75000", 8), // +200%
        ethers.parseUnits("50000", 8), // -33%
      ];

      for (let i = 0; i < prices.length; i++) {
        const contestId = await lumenPriceArena.latestContestId();
        await mockOracle.updatePrice(prices[i]);

        const contest = await lumenPriceArena.getContest(contestId);
        await time.increaseTo(contest.settleTime + BigInt(1));

        await expect(lumenPriceArena.settleContest(contestId)).to.not.be
          .reverted;
      }
    });
  });
});

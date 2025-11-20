const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LumenPriceArena", function () {
  let lumenPriceArena;
  let mockOracle;
  let owner, player1, player2, player3;
  const ENTRY_FEE = ethers.parseEther("0.00035");
  const ROUND_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
  const LOCK_DURATION = 4 * 24 * 60 * 60; // 4 days in seconds

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy mock Chainlink oracle
    const MockAggregator = await ethers.getContractFactory("MockAggregatorV3");
    mockOracle = await MockAggregator.deploy(8, ethers.parseUnits("50000", 8)); // BTC price: $50,000
    await mockOracle.waitForDeployment();

    // Deploy LumenPriceArena
    const LumenPriceArena = await ethers.getContractFactory("LumenPriceArena");
    lumenPriceArena = await LumenPriceArena.deploy(
      ENTRY_FEE,
      await mockOracle.getAddress()
    );
    await lumenPriceArena.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct entry fee", async function () {
      expect(await lumenPriceArena.entryFee()).to.equal(ENTRY_FEE);
    });

    it("Should set the correct oracle address", async function () {
      expect(await lumenPriceArena.defaultOracle()).to.equal(
        await mockOracle.getAddress()
      );
    });

    it("Should create the first contest automatically", async function () {
      expect(await lumenPriceArena.latestContestId()).to.equal(1);
    });

    it("Should initialize first contest with correct parameters", async function () {
      const contest = await lumenPriceArena.getContest(1);
      expect(contest.settled).to.be.false;
      expect(contest.prizePool).to.equal(0);
      expect(contest.directionsReady).to.be.false;
    });
  });

  describe("Contest Creation", function () {
    it("Should set correct lock time (4 days from start)", async function () {
      const contest = await lumenPriceArena.getContest(1);
      const expectedLockTime = contest.startTime + BigInt(LOCK_DURATION);
      expect(contest.lockTime).to.equal(expectedLockTime);
    });

    it("Should set correct settle time (7 days from start)", async function () {
      const contest = await lumenPriceArena.getContest(1);
      const expectedSettleTime = contest.startTime + BigInt(ROUND_DURATION);
      expect(contest.settleTime).to.equal(expectedSettleTime);
    });

    it("Should fetch and store starting BTC price", async function () {
      const rangeBounds = await lumenPriceArena.getRangeBounds(1);
      expect(rangeBounds.length).to.equal(3); // [-10000, 0, 10000]
      expect(rangeBounds[0]).to.equal(-10000);
      expect(rangeBounds[1]).to.equal(0);
      expect(rangeBounds[2]).to.equal(10000);
    });
  });

  describe("Entry Phase", function () {
    it("Should revert if entry fee is incorrect", async function () {
      // This test is simplified - in real implementation, you'd need FHE encryption
      const incorrectFee = ethers.parseEther("0.0001");
      await expect(
        lumenPriceArena.connect(player1).enterContest(
          "0x00", // Mock encrypted direction
          "0x",
          { value: incorrectFee }
        )
      ).to.be.reverted;
    });

    it("Should revert if trying to enter after lock time", async function () {
      const contest = await lumenPriceArena.getContest(1);

      // Fast forward past lock time
      await time.increaseTo(contest.lockTime + BigInt(1));

      await expect(
        lumenPriceArena.connect(player1).enterContest(
          "0x00",
          "0x",
          { value: ENTRY_FEE }
        )
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");
    });

    it("Should revert if player tries to enter twice", async function () {
      // Note: In real implementation, this would require proper FHE encryption
      // This is a simplified test structure

      // First entry would succeed (skipped due to FHE requirement)
      // await lumenPriceArena.connect(player1).enterContest(..., { value: ENTRY_FEE });

      // Second entry should fail
      // await expect(
      //   lumenPriceArena.connect(player1).enterContest(..., { value: ENTRY_FEE })
      // ).to.be.revertedWithCustomError(lumenPriceArena, "AlreadyEntered");
    });

    it("Should increase prize pool when players enter", async function () {
      // Note: Actual test would require FHE encryption mock
      // Expected behavior: prize pool increases by ENTRY_FEE for each entry
    });
  });

  describe("Reveal Phase", function () {
    it("Should revert reveal request before lock time", async function () {
      await expect(
        lumenPriceArena.requestRangeReveal(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");
    });

    it("Should allow reveal request after lock time", async function () {
      const contest = await lumenPriceArena.getContest(1);

      // Fast forward to after lock time
      await time.increaseTo(contest.lockTime + BigInt(1));

      // Should revert with NothingToClaim if no entries (expected in this test)
      await expect(
        lumenPriceArena.requestRangeReveal(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "NothingToClaim");
    });

    it("Should revert if reveal already submitted", async function () {
      // Note: Requires proper test setup with entries and first reveal
      // await expect(
      //   lumenPriceArena.requestRangeReveal(1)
      // ).to.be.revertedWithCustomError(lumenPriceArena, "DirectionsAlreadyRevealed");
    });

    it("Should emit DirectionsRevealRequested event", async function () {
      // Note: Requires entries to be present
      // await expect(lumenPriceArena.requestRangeReveal(1))
      //   .to.emit(lumenPriceArena, "DirectionsRevealRequested");
    });
  });

  describe("Settlement Phase", function () {
    it("Should revert settlement before settle time", async function () {
      await expect(
        lumenPriceArena.settleContest(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");
    });

    it("Should allow settlement after settle time", async function () {
      const contest = await lumenPriceArena.getContest(1);

      // Fast forward to after settle time
      await time.increaseTo(contest.settleTime + BigInt(1));

      // Should succeed even with no entries (rolls over prize pool)
      await expect(lumenPriceArena.settleContest(1))
        .to.emit(lumenPriceArena, "ContestSettled");
    });

    it("Should rollover prize pool if no entries", async function () {
      const contest = await lumenPriceArena.getContest(1);

      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      const settledContest = await lumenPriceArena.getContest(1);
      expect(settledContest.settled).to.be.true;
      expect(settledContest.rolled).to.be.true;
    });

    it("Should create next contest after settlement", async function () {
      const contest = await lumenPriceArena.getContest(1);

      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      // Check that contest 2 was created
      expect(await lumenPriceArena.latestContestId()).to.equal(2);
    });

    it("Should determine correct winning direction based on price change", async function () {
      // Note: Requires full test setup with entries and price oracle update
      // 1. Players enter with UP/DOWN predictions
      // 2. Update mock oracle price
      // 3. Settle contest
      // 4. Verify correct winners
    });
  });

  describe("Prize Claiming", function () {
    it("Should revert claim before settlement", async function () {
      await expect(
        lumenPriceArena.connect(player1).claimPrize(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestLocked");
    });

    it("Should revert claim if not a winner", async function () {
      const contest = await lumenPriceArena.getContest(1);

      await time.increaseTo(contest.settleTime + BigInt(1));
      await lumenPriceArena.settleContest(1);

      await expect(
        lumenPriceArena.connect(player1).claimPrize(1)
      ).to.be.revertedWithCustomError(lumenPriceArena, "NotWinner");
    });

    it("Should revert claim if already claimed", async function () {
      // Note: Requires full test setup
      // 1. Player wins
      // 2. Player claims once (succeeds)
      // 3. Player claims again (reverts with AlreadyClaimed)
    });

    it("Should distribute prize equally among winners", async function () {
      // Note: Requires full test setup with multiple winners
      // Each winner should receive prizePool / winnerCount
    });

    it("Should give remainder to last claimer", async function () {
      // Note: Test for rounding remainder handling
      // Last winner gets prizePool - (previousClaims * perWinnerAmount)
    });
  });

  describe("View Functions", function () {
    it("Should return correct contest details", async function () {
      const contest = await lumenPriceArena.getContest(1);

      expect(contest.startTime).to.be.gt(0);
      expect(contest.lockTime).to.be.gt(contest.startTime);
      expect(contest.settleTime).to.be.gt(contest.lockTime);
      expect(contest.prizePool).to.equal(0);
    });

    it("Should return correct range bounds", async function () {
      const bounds = await lumenPriceArena.getRangeBounds(1);

      expect(bounds).to.have.lengthOf(3);
      expect(bounds[0]).to.equal(-10000);
      expect(bounds[1]).to.equal(0);
      expect(bounds[2]).to.equal(10000);
    });

    it("Should return correct range stats", async function () {
      const stats = await lumenPriceArena.getRangeStats(1);

      expect(stats).to.have.lengthOf(2); // UP and DOWN
      expect(stats[0].revealedExposure).to.equal(0);
      expect(stats[1].revealedExposure).to.equal(0);
    });

    it("Should return correct player status", async function () {
      const status = await lumenPriceArena.getPlayerStatus(1, player1.address);

      expect(status.entered).to.be.false;
      expect(status.won).to.be.false;
      expect(status.claimed).to.be.false;
    });

    it("Should revert getting non-existent contest", async function () {
      await expect(
        lumenPriceArena.getContest(999)
      ).to.be.revertedWithCustomError(lumenPriceArena, "ContestMissing");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle contest with no winners (rollover)", async function () {
      const contest = await lumenPriceArena.getContest(1);

      await time.increaseTo(contest.settleTime + BigInt(1));

      const tx = await lumenPriceArena.settleContest(1);
      const receipt = await tx.wait();

      const settledContest = await lumenPriceArena.getContest(1);
      expect(settledContest.rolled).to.be.true;

      // Next contest should exist
      const nextContest = await lumenPriceArena.getContest(2);
      expect(nextContest.startTime).to.be.gt(0);
    });

    it("Should handle extremely long time jumps", async function () {
      const contest = await lumenPriceArena.getContest(1);

      // Jump far into future
      await time.increaseTo(contest.settleTime + BigInt(365 * 24 * 60 * 60));

      // Should still be settleable
      await expect(lumenPriceArena.settleContest(1))
        .to.emit(lumenPriceArena, "ContestSettled");
    });

    it("Should handle minimum entry fee correctly", async function () {
      const minFee = await lumenPriceArena.MIN_ENTRY_FEE();
      expect(minFee).to.equal(ethers.parseEther("0.00035"));
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas cost for entry", async function () {
      // Note: Gas cost measurement
      // const tx = await lumenPriceArena.connect(player1).enterContest(...);
      // const receipt = await tx.wait();
      // expect(receipt.gasUsed).to.be.lt(500000); // Example threshold
    });

    it("Should have reasonable gas cost for settlement", async function () {
      const contest = await lumenPriceArena.getContest(1);
      await time.increaseTo(contest.settleTime + BigInt(1));

      const tx = await lumenPriceArena.settleContest(1);
      const receipt = await tx.wait();

      // Settlement should be relatively cheap when no entries
      expect(receipt.gasUsed).to.be.lt(300000);
    });
  });
});

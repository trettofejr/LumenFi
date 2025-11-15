// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Lumen Price Arena
 * @notice 7 天周期的去中心化涨跌预测赛，玩家的方向 (Up/Down) 以 FHE 密文形式入链，
 *         锁定后才公开解密；Chainlink 价格决定胜负，无需管理员干预。
 */
contract LumenPriceArena is ZamaEthereumConfig {
    struct Contest {
        bool exists;
        uint64 contestId;
        address oracle;
        uint256 startTime;
        uint256 lockTime;
        uint256 settleTime;
        uint256 entryFee;
        uint256 prizePool;
        bool directionsReady;
        bool settled;
        bool rolledOver;
        int256 startPrice;
        int256[] rangeBounds; // [-10000, 0, 10000]
        uint8 winningRange;
        uint256 winnerCount;
        uint256 claimedCount;
        address[] entrants;
        uint64[2] revealedExposure;
    }

    struct Entry {
        bool exists;
        bool claimed;
        euint8 directionCipher;
        uint8 revealedDirection;
        bool directionRevealed;
    }

    struct RevealRequest {
        bytes32[] handles;
        bool pending;
    }

    struct RangeStat {
        bytes32 cipher;
        uint64 revealedExposure;
        uint256 entrants;
    }

    uint256 public constant ROUND_DURATION = 7 days;
    uint256 public constant MIN_ENTRY_FEE = 0.00035 ether;

    uint64 public latestContestId;
    uint256 public immutable entryFee;
    AggregatorV3Interface public immutable defaultOracle;

    mapping(uint64 => Contest) private contests;
    mapping(uint64 => mapping(address => Entry)) private entries;
    mapping(uint64 => RevealRequest) private revealRequests;

    event ContestCreated(uint64 indexed contestId, address oracle, uint256 lockTime, uint256 settleTime);
    event TicketEntered(uint64 indexed contestId, address indexed player);
    event DirectionsRevealRequested(uint64 indexed contestId, bytes32[] handles);
    event DirectionsRevealSubmitted(uint64 indexed contestId, uint256 count);
    event ContestSettled(uint64 indexed contestId, uint8 winningRange, uint256 winnerCount, bool rolledOver);
    event PrizeClaimed(uint64 indexed contestId, address indexed player, uint256 payout, bool finalClaim);

    error ContestMissing();
    error ContestLocked();
    error AlreadyEntered();
    error InsufficientFee();
    error RevealPending();
    error RevealMissing();
    error DirectionsNotReady();
    error DirectionsAlreadyRevealed();
    error NothingToClaim();
    error NotWinner();
    error AlreadyClaimed();

    constructor(uint256 entryFeeWei, address oracle) {
        require(entryFeeWei >= MIN_ENTRY_FEE, "fee");
        require(oracle != address(0), "oracle");
        entryFee = entryFeeWei;
        defaultOracle = AggregatorV3Interface(oracle);
        _createNextContest(0, oracle);
    }

    // --------------------------- Participation ---------------------------

    function enterContest(externalEuint8 encryptedDirection, bytes calldata proof) external payable {
        Contest storage contest = contests[latestContestId];
        if (!contest.exists) revert ContestMissing();
        if (block.timestamp >= contest.lockTime) revert ContestLocked();
        if (entries[latestContestId][msg.sender].exists) revert AlreadyEntered();
        if (msg.value != contest.entryFee) revert InsufficientFee();

        euint8 directionCipher = FHE.fromExternal(encryptedDirection, proof);
        FHE.allow(directionCipher, msg.sender);
        FHE.allowThis(directionCipher);

        Entry storage entry = entries[latestContestId][msg.sender];
        entry.exists = true;
        entry.claimed = false;
        entry.directionCipher = directionCipher;

        contest.entrants.push(msg.sender);
        contest.prizePool += msg.value;

        emit TicketEntered(latestContestId, msg.sender);
    }

    // ---------------------------- Reveal Flow ----------------------------

    function requestRangeReveal(uint64 contestId) external {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        if (block.timestamp < contest.lockTime) revert ContestLocked();
        if (contest.directionsReady) revert DirectionsAlreadyRevealed();

        RevealRequest storage reveal = revealRequests[contestId];
        if (reveal.pending) revert RevealPending();

        uint256 entrantCount = contest.entrants.length;
        if (entrantCount == 0) revert NothingToClaim();

        bytes32[] memory handles = new bytes32[](entrantCount);
        for (uint256 i = 0; i < entrantCount; i++) {
            Entry storage entry = entries[contestId][contest.entrants[i]];
            FHE.makePubliclyDecryptable(entry.directionCipher);
            handles[i] = FHE.toBytes32(entry.directionCipher);
        }

        reveal.handles = handles;
        reveal.pending = true;
        emit DirectionsRevealRequested(contestId, handles);
    }

    function submitRangeReveal(
        uint64 contestId,
        bytes calldata abiEncodedDirections,
        bytes calldata decryptionProof
    ) external {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        if (contest.directionsReady) revert DirectionsAlreadyRevealed();

        RevealRequest storage reveal = revealRequests[contestId];
        if (!reveal.pending) revert RevealMissing();

        bytes32[] memory handles = reveal.handles;
        if (handles.length == 0) revert RevealMissing();

        FHE.checkSignatures(handles, abiEncodedDirections, decryptionProof);

        uint8[] memory directions = abi.decode(abiEncodedDirections, (uint8[]));
        require(directions.length == contest.entrants.length, "len");

        delete contest.revealedExposure;

        for (uint256 i = 0; i < directions.length; i++) {
            address player = contest.entrants[i];
            Entry storage entry = entries[contestId][player];
            entry.revealedDirection = directions[i];
            entry.directionRevealed = true;

            if (directions[i] == 0) {
                contest.revealedExposure[0] += 1;
            } else if (directions[i] == 1) {
                contest.revealedExposure[1] += 1;
            } else {
                revert("bad dir");
            }
        }

        contest.directionsReady = true;
        reveal.pending = false;
        delete reveal.handles;
        emit DirectionsRevealSubmitted(contestId, directions.length);
    }

    // ---------------------------- Settlement ----------------------------

    function settleContest(uint64 contestId) external {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        if (contest.settled) revert ContestLocked();
        if (block.timestamp < contest.settleTime) revert ContestLocked();

        if (contest.prizePool == 0) {
            contest.settled = true;
            contest.rolledOver = true;
            _createNextContest(0, contest.oracle);
            emit ContestSettled(contestId, 0, 0, true);
            return;
        }

        if (!contest.directionsReady) revert DirectionsNotReady();

        int256 finalPrice = _fetchPrice(contest.oracle);
        int256 percentChange = ((finalPrice - contest.startPrice) * 10_000) / contest.startPrice; // basis points
        uint8 winningRange = _pickWinningRange(contest.rangeBounds, percentChange);

        contest.winningRange = winningRange;
        contest.winnerCount = contest.revealedExposure[winningRange];
        contest.settled = true;

        if (contest.winnerCount == 0) {
            contest.rolledOver = true;
            _createNextContest(contest.prizePool, contest.oracle);
            emit ContestSettled(contestId, winningRange, 0, true);
        } else {
            _createNextContest(0, contest.oracle);
            emit ContestSettled(contestId, winningRange, contest.winnerCount, false);
        }
    }

    function claimPrize(uint64 contestId) external {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        if (!contest.settled || contest.rolledOver) revert ContestLocked();

        Entry storage entry = entries[contestId][msg.sender];
        if (!entry.exists) revert NotWinner();
        if (entry.claimed) revert AlreadyClaimed();
        if (!entry.directionRevealed) revert DirectionsNotReady();
        if (entry.revealedDirection != contest.winningRange) revert NotWinner();

        uint256 payout;
        if (contest.winnerCount == 0) revert NothingToClaim();
        if (contest.winnerCount - 1 == contest.claimedCount) {
            payout = contest.prizePool;
        } else {
            payout = contest.prizePool / contest.winnerCount;
        }

        contest.claimedCount += 1;
        contest.prizePool -= payout;
        entry.claimed = true;

        (bool ok, ) = payable(msg.sender).call{ value: payout }("");
        require(ok, "transfer failed");

        emit PrizeClaimed(contestId, msg.sender, payout, contest.claimedCount == contest.winnerCount);
    }

    // ------------------------------ Views ------------------------------

    function getContest(uint64 contestId)
        external
        view
        returns (
            uint256 startTime,
            uint256 lockTime,
            uint256 settleTime,
            uint256 prizePool,
            bool directionsReady,
            bool settled,
            bool rolled,
            uint8 winningRange
        )
    {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        return (
            contest.startTime,
            contest.lockTime,
            contest.settleTime,
            contest.prizePool,
            contest.directionsReady,
            contest.settled,
            contest.rolledOver,
            contest.winningRange
        );
    }

    function getRangeBounds(uint64 contestId) external view returns (int256[] memory) {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        return contest.rangeBounds;
    }

    function getRangeStats(uint64 contestId) external view returns (RangeStat[] memory stats) {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        stats = new RangeStat[](2);
        for (uint256 i = 0; i < 2; i++) {
            stats[i] = RangeStat({
                cipher: bytes32(0),
                revealedExposure: contest.revealedExposure[i],
                entrants: contest.directionsReady ? contest.revealedExposure[i] : 0
            });
        }
    }

    function getPlayerStatus(uint64 contestId, address player)
        external
        view
        returns (bool entered, bool won, bool claimed)
    {
        Contest storage contest = contests[contestId];
        if (!contest.exists) revert ContestMissing();
        Entry storage entry = entries[contestId][player];
        entered = entry.exists;
        won = contest.settled && !contest.rolledOver && entry.directionRevealed && entry.revealedDirection == contest.winningRange;
        claimed = entry.claimed;
    }

    function getPendingRevealHandles(uint64 contestId) external view returns (bytes32[] memory) {
        RevealRequest storage reveal = revealRequests[contestId];
        if (!reveal.pending) revert RevealMissing();
        return reveal.handles;
    }

    // ----------------------------- Internal -----------------------------

    function _createNextContest(uint256 carryOver, address oracle) internal {
        latestContestId += 1;
        Contest storage contest = contests[latestContestId];
        contest.exists = true;
        contest.contestId = latestContestId;
        contest.oracle = oracle;
        contest.entryFee = entryFee;
        contest.startTime = block.timestamp;
        contest.lockTime = block.timestamp + 4 days;
        contest.settleTime = block.timestamp + ROUND_DURATION;
        contest.prizePool = carryOver;
        contest.startPrice = _fetchPrice(oracle);
        contest.rangeBounds = _defaultBounds();
        delete contest.entrants;
        contest.revealedExposure[0] = 0;
        contest.revealedExposure[1] = 0;
        contest.directionsReady = false;
        contest.settled = false;
        contest.rolledOver = false;
        contest.winnerCount = 0;
        contest.claimedCount = 0;

        emit ContestCreated(latestContestId, oracle, contest.lockTime, contest.settleTime);
    }

    function _pickWinningRange(int256[] memory bounds, int256 percentChange) internal pure returns (uint8) {
        for (uint8 i = 0; i < bounds.length - 1; i++) {
            if (percentChange >= bounds[i] && percentChange < bounds[i + 1]) {
                return i;
            }
        }
        return uint8(bounds.length - 2);
    }

    function _defaultBounds() internal pure returns (int256[] memory) {
        int256[] memory bounds = new int256[](3);
        bounds[0] = -10_000;
        bounds[1] = 0;
        bounds[2] = 10_000;
        return bounds;
    }

    function _fetchPrice(address oracle) internal view returns (int256) {
        (, int256 price, , , ) = AggregatorV3Interface(oracle).latestRoundData();
        require(price > 0, "price");
        return price;
    }
}

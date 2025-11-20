// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockAggregatorV3
 * @notice Mock Chainlink AggregatorV3Interface for testing
 */
contract MockAggregatorV3 {
    uint8 public decimals;
    int256 private _price;
    uint80 private _roundId;
    uint256 private _updatedAt;

    constructor(uint8 _decimals, int256 initialPrice) {
        decimals = _decimals;
        _price = initialPrice;
        _roundId = 1;
        _updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }

    function updatePrice(int256 newPrice) external {
        _price = newPrice;
        _roundId += 1;
        _updatedAt = block.timestamp;
    }

    function getRoundData(uint80 roundId)
        external
        view
        returns (
            uint80,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (roundId, _price, _updatedAt, _updatedAt, roundId);
    }

    function description() external pure returns (string memory) {
        return "Mock BTC/USD";
    }

    function version() external pure returns (uint256) {
        return 4;
    }
}

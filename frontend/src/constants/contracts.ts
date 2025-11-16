const address = (import.meta.env.VITE_LUMEN_PRICE_ARENA_ADDRESS as string | undefined)?.trim();
if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
  throw new Error("VITE_LUMEN_PRICE_ARENA_ADDRESS 未设置或格式错误");
}

export const LUMEN_PRICE_ARENA_ADDRESS = address as `0x${string}`;

export const LUMEN_PRICE_ARENA_ABI = [
  {
    type: "function",
    name: "entryFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "latestContestId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }]
  },
  {
    type: "function",
    name: "getContest",
    stateMutability: "view",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: [
      { name: "startTime", type: "uint256" },
      { name: "lockTime", type: "uint256" },
      { name: "settleTime", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "directionsReady", type: "bool" },
      { name: "settled", type: "bool" },
      { name: "rolledOver", type: "bool" },
      { name: "winningRange", type: "uint8" }
    ]
  },
  {
    type: "function",
    name: "getRangeBounds",
    stateMutability: "view",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: [{ name: "", type: "int256[]" }]
  },
  {
    type: "function",
    name: "getRangeStats",
    stateMutability: "view",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "cipher", type: "bytes32" },
          { name: "revealedExposure", type: "uint64" },
          { name: "entrants", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getPlayerStatus",
    stateMutability: "view",
    inputs: [
      { name: "contestId", type: "uint64" },
      { name: "player", type: "address" }
    ],
    outputs: [
      { name: "entered", type: "bool" },
      { name: "won", type: "bool" },
      { name: "prizeClaimed", type: "bool" }
    ]
  },
  {
    type: "function",
    name: "getPendingRevealHandles",
    stateMutability: "view",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: [{ name: "", type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "enterContest",
    stateMutability: "payable",
    inputs: [
      { name: "encryptedDirection", type: "bytes32" },
      { name: "proof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "requestRangeReveal",
    stateMutability: "nonpayable",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: []
  },
  {
    type: "function",
    name: "submitRangeReveal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contestId", type: "uint64" },
      { name: "abiEncodedNumbers", type: "bytes" },
      { name: "decryptionProof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "settleContest",
    stateMutability: "nonpayable",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: []
  },
  {
    type: "function",
    name: "defaultOracle",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "claimPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "contestId", type: "uint64" }],
    outputs: []
  }
] as const;

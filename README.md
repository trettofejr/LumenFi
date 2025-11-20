# Lumen Price Arena

<p align="center">
  <img src="./frontend/public/logo.png" alt="Lumen Price Arena" width="200"/>
</p>

<p align="center">
  <strong>A Fully Decentralized BTC Price Prediction Game Powered by Zama's fhEVM</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#technology-stack">Technology Stack</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#smart-contract">Smart Contract</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**Lumen Price Arena** is a privacy-preserving, fully decentralized prediction market where players bet on Bitcoin price movements (UP or DOWN) over 7-day cycles. Built on Zama's **fhEVM 0.9.1**, all predictions are encrypted on-chain using Fully Homomorphic Encryption (FHE), ensuring complete privacy until the reveal phase. Chainlink oracles provide trustless price feeds for settlement.

### Why Lumen Price Arena?

- ⚡ **Zero Trust Required**: No admin controls, no custodians. Fully permissionless and censorship-resistant.
- 🔒 **Privacy First**: Predictions are encrypted using FHE. Even validators cannot see your choice before reveal.
- 🤖 **Fully Automated**: Rounds auto-start and settle. Winners claim prizes via smart contract.
- 🎯 **Fair & Transparent**: Chainlink oracles ensure unbiased price settlement. All logic is verifiable on-chain.

---

## Features

### 🎮 Core Gameplay
- **7-Day Rounds**: 4 days for entry + 3 days for settlement
- **Binary Predictions**: Bet on BTC going UP (1) or DOWN (0)
- **Entry Fee**: 0.00035 ETH per prediction (configurable)
- **Winner-Takes-All**: Prize pool split equally among correct predictions
- **Rollover Jackpots**: If no winners, prize pool carries over to next round

### 🔐 Privacy & Security
- **FHE Encryption**: Predictions stored as `euint8` ciphertext on-chain
- **Public Decryption Protocol**: Post-lock reveal via `requestRangeReveal` → `submitRangeReveal`
- **Cryptographic Proofs**: FHE signature verification prevents tampering
- **No Front-Running**: Encrypted predictions eliminate MEV attacks

### 🌐 Decentralization
- **Permissionless**: Anyone can enter, reveal, settle, or claim
- **Auto-Rotation**: Rounds auto-start after settlement
- **Chainlink Integration**: BTC/USD price feeds from decentralized oracles
- **No Admin Keys**: Immutable contract logic after deployment

---

## How It Works

### Phase 1: Entry (Days 1-4)
1. Player selects **UP** or **DOWN** prediction
2. Frontend encrypts choice using fhEVM SDK (`encryptDirection`)
3. Player calls `enterContest(encryptedDirection, proof)` with entry fee
4. Smart contract stores encrypted prediction as `euint8` ciphertext

### Phase 2: Lock & Reveal (Day 4+)
1. After 4 days, entry phase locks automatically
2. Anyone calls `requestRangeReveal(contestId)`
3. Contract marks all predictions for public decryption via `FHE.makePubliclyDecryptable()`
4. Relayer/Player fetches decrypted values using fhEVM SDK
5. Submit decrypted values via `submitRangeReveal()` with cryptographic proof

### Phase 3: Settlement (Day 7+)
1. Anyone calls `settleContest(contestId)` after 7 days
2. Contract fetches final BTC price from Chainlink oracle
3. Compares final price vs. starting price to determine UP or DOWN
4. Counts winners in correct direction
5. Auto-creates next round with new starting price

### Phase 4: Claim (Post-Settlement)
1. Winners call `claimPrize(contestId)`
2. Prize pool divided equally among winners
3. Last claimer receives remainder to ensure complete distribution
4. If no winners, prize rolls over to next round

---

## Technology Stack

### Smart Contracts
- **Solidity**: `0.8.24`
- **Zama fhEVM**: `0.9.1` (Fully Homomorphic Encryption)
- **Chainlink**: Price Feeds (BTC/USD Aggregator)
- **Hardhat**: `2.19.0` (Development Framework)

### Frontend
- **React**: `18.3.1` + TypeScript
- **Vite**: `5.2.11` (Build Tool)
- **TailwindCSS**: `3.4.4` (Styling)
- **Shadcn UI**: Component Library

### Web3 Integration
- **Wagmi**: `2.9.9` (React Hooks for Ethereum)
- **Viem**: `2.13.3` (TypeScript Interface for Ethereum)
- **RainbowKit**: `2.1.0` (Wallet Connection)
- **TanStack Query**: `5.45.0` (State Management)
- **Zama Relayer SDK**: `0.3.0-5` (FHE Decryption)

### Blockchain Network
- **Ethereum Sepolia Testnet**
- **Zama fhEVM Devnet** (for FHE operations)

---

## Installation

### Prerequisites
- Node.js `>= 18.x`
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH ([faucet](https://sepoliafaucet.com/))

### Clone Repository
```bash
git clone https://github.com/trettofejr/LumenFi.git
cd LumenFi
```

### Install Dependencies

#### Smart Contracts
```bash
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

---

## Usage

### 1. Configure Environment Variables

#### Root `.env` (Smart Contracts)
```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key (optional for verification)
```

#### Frontend `.env`
```env
VITE_LUMEN_PRICE_ARENA_ADDRESS=0xYourDeployedContractAddress
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 2. Compile Smart Contracts
```bash
npm run compile
```

### 3. Deploy to Sepolia
```bash
npm run deploy
```

Example output:
```
LumenPriceArena deployed to: 0x1234...abcd
Entry Fee: 0.00035 ETH
Oracle: 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43 (BTC/USD)
```

### 4. Update Frontend Contract Address
Copy deployed address to `frontend/.env`:
```env
VITE_LUMEN_PRICE_ARENA_ADDRESS=0x1234...abcd
```

### 5. Run Frontend
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in browser.

---

## Smart Contract

### Core Functions

#### Entry Phase
```solidity
function enterContest(
    externalEuint8 encryptedDirection,
    bytes calldata proof
) external payable
```
Submit encrypted prediction (UP=1 or DOWN=0) with entry fee.

#### Reveal Phase
```solidity
function requestRangeReveal(uint64 contestId) external
```
Trigger public decryption of all encrypted predictions.

```solidity
function submitRangeReveal(
    uint64 contestId,
    bytes calldata abiEncodedDirections,
    bytes calldata decryptionProof
) external
```
Submit decrypted prediction values with cryptographic proof.

#### Settlement
```solidity
function settleContest(uint64 contestId) external
```
Fetch final BTC price from Chainlink, determine winners, auto-create next round.

#### Claiming
```solidity
function claimPrize(uint64 contestId) external
```
Winners claim their share of prize pool.

### View Functions
```solidity
getContest(uint64 contestId) → (startTime, lockTime, settleTime, prizePool, ...)
getRangeBounds(uint64 contestId) → int256[] bounds
getRangeStats(uint64 contestId) → (entrants, revealedExposure per range)
getPlayerStatus(uint64 contestId, address player) → (entered, won, claimed)
```

### Events
```solidity
event ContestCreated(uint64 indexed contestId, address oracle, uint256 lockTime, uint256 settleTime);
event TicketEntered(uint64 indexed contestId, address indexed player);
event DirectionsRevealRequested(uint64 indexed contestId, bytes32[] handles);
event DirectionsRevealSubmitted(uint64 indexed contestId, uint256 count);
event ContestSettled(uint64 indexed contestId, uint8 winningRange, uint256 winnerCount, bool rolledOver);
event PrizeClaimed(uint64 indexed contestId, address indexed player, uint256 payout, bool finalClaim);
```

---

## Architecture

### System Flow
```
┌─────────────┐
│   Player    │
└──────┬──────┘
       │ 1. Encrypt Prediction (UP/DOWN)
       ▼
┌─────────────────────────┐
│   fhEVM SDK (Frontend)  │
└──────────┬──────────────┘
           │ 2. Generate Ciphertext + Proof
           ▼
┌─────────────────────────────────┐
│  LumenPriceArena (Smart Contract) │
│  - Store euint8 ciphertext       │
│  - Lock after 4 days             │
└──────────┬──────────────────────┘
           │ 3. requestRangeReveal()
           ▼
┌─────────────────────────┐
│  FHE.makePubliclyDecryptable() │
└──────────┬──────────────┘
           │ 4. Relayer fetches decrypted values
           ▼
┌─────────────────────────┐
│  submitRangeReveal()    │
│  (with proof)           │
└──────────┬──────────────┘
           │ 5. settleContest()
           ▼
┌─────────────────────────┐
│  Chainlink Oracle       │
│  (BTC/USD Price Feed)   │
└──────────┬──────────────┘
           │ 6. Determine Winners
           ▼
┌─────────────────────────┐
│  claimPrize()           │
│  (Winners receive ETH)  │
└─────────────────────────┘
```

### Data Flow: Privacy Guarantees
1. **Entry**: Player's choice encrypted client-side → stored as `euint8` on-chain
2. **Storage**: Only ciphertext visible to validators/observers
3. **Reveal**: Post-lock, `FHE.makePubliclyDecryptable()` marks ciphertext for decryption
4. **Decryption**: Relayer fetches plaintext from Zama network
5. **Verification**: Smart contract verifies `FHE.checkSignatures()` before accepting plaintext

---

## Development

### Run Tests
```bash
npm test
```

### Local Hardhat Network
```bash
npx hardhat node
```

### Deploy to Local Network
```bash
npx hardhat run scripts/deploy.cjs --network localhost
```

### Verify Contract on Etherscan
```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "350000000000000" "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"
```

---

## FAQ

### Why use FHE instead of commit-reveal schemes?
Traditional commit-reveal requires players to submit hashes first, then reveal secrets later. This creates poor UX (two transactions) and allows observing when players reveal (timing attacks). FHE encrypts predictions in one transaction, with automated batch reveal via relayers.

### How are Chainlink prices fetched?
The contract uses `AggregatorV3Interface.latestRoundData()` to fetch BTC/USD price from Chainlink's decentralized oracle network. Price is compared against the starting price recorded at round creation.

### What happens if no one reveals predictions?
The game requires `directionsReady = true` before settlement. If no one calls `requestRangeReveal()` + `submitRangeReveal()`, the round cannot settle. However, anyone (including automated bots) can trigger reveal, ensuring liveness.

### Can the contract owner manipulate results?
No. The contract has zero admin functions post-deployment. Settlement logic is deterministic based on Chainlink prices and revealed predictions. Even the deployer cannot pause, upgrade, or withdraw funds.

### What prevents Sybil attacks?
Entry fee creates economic cost. While a player can submit multiple predictions, they must pay for each entry. The prize pool is split equally among winners, so submitting both UP and DOWN guarantees breaking even (minus gas), not profit.

---

## Security Considerations

### Audited Components
- ✅ Zama fhEVM library (`@fhevm/solidity`)
- ✅ Chainlink oracles (`@chainlink/contracts`)
- ⚠️ **Custom game logic**: Not yet audited (testnet deployment only)

### Known Limitations
1. **Gas Costs**: FHE operations are computationally expensive. Optimized for batches.
2. **Relayer Dependency**: Reveal phase requires off-chain relayer to fetch decrypted values.
3. **Oracle Latency**: Chainlink price updates may have 1-3 minute delays.

### Recommended Actions Before Mainnet
- [ ] Third-party smart contract audit
- [ ] Formal verification of settlement logic
- [ ] Economic modeling of rollover scenarios
- [ ] Frontend penetration testing

---

## Roadmap

- [x] Core FHE prediction mechanics
- [x] Chainlink price oracle integration
- [x] Auto-rotation rounds
- [x] Frontend with wallet connection
- [ ] Multi-asset support (ETH, SOL, etc.)
- [ ] Progressive jackpots for consecutive wins
- [ ] DAO governance for parameter updates
- [ ] Layer 2 deployment (Arbitrum, Optimism)

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## Resources

- **Zama Documentation**: https://docs.zama.org/
- **fhEVM GitHub**: https://github.com/zama-ai/fhevm
- **Chainlink Price Feeds**: https://docs.chain.link/data-feeds
- **Hardhat Docs**: https://hardhat.org/docs

---

## Contact

For questions, issues, or suggestions:
- GitHub Issues: [https://github.com/trettofejr/LumenFi/issues](https://github.com/trettofejr/LumenFi/issues)
- Demo: [Watch Demo Video](./frontend/public/demo_test_bet.mp4)

---

<p align="center">Made with ❤️ using Zama's fhEVM</p>

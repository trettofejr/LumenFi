const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Deploying LumenPriceArena...\n");

  // Constructor parameters: entryFee (in wei), oracle address
  const entryFeeWei = hre.ethers.parseEther("0.001"); // 0.001 ETH entry fee
  const btcUsdOracleAddress = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"; // BTC/USD on Sepolia

  console.log("📋 Constructor params:");
  console.log(`   Entry Fee: ${hre.ethers.formatEther(entryFeeWei)} ETH`);
  console.log(`   Oracle: ${btcUsdOracleAddress} (BTC/USD Chainlink)`);
  console.log("");

  const LumenPriceArena = await hre.ethers.getContractFactory("LumenPriceArena");
  const contest = await LumenPriceArena.deploy(entryFeeWei, btcUsdOracleAddress);
  await contest.waitForDeployment();

  const address = await contest.getAddress();

  console.log("✅ LumenPriceArena deployed to:", address);
  console.log("\n📝 Update frontend/src/constants/contracts.ts:");
  console.log(`   LUMEN_PRICE_ARENA_ADDRESS = "${address}"`);
  console.log("\n🔗 View on Sepolia Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${address}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/**
 * Registers the analyst and manager demo wallets on the local Hardhat chain.
 * Run after deploy.js: npx hardhat run scripts/register-local-wallets.js --network localhost
 * Uses Hardhat's public test accounts #1 and #2. Never use them on a live network.
 */
const hre = require("hardhat");
const deployment = require("../deployments/localhost.json");

const ANALYST = 0x01;
const MANAGER = 0x02;

async function main() {
  const { ethers } = hre;
  const [, analyst, manager] = await ethers.getSigners();
  const contract = await ethers.getContractAt("TrustChainGovernance", deployment.address);
  const orgId = ethers.encodeBytes32String("ORG-APEX-GLOBAL");
  for (const [label, wallet, categories] of [["analyst", analyst, ANALYST], ["manager", manager, MANAGER]]) {
    if (await contract.isActiveWallet(wallet.address)) {
      console.log(`${label}: ${wallet.address} already active`);
      continue;
    }
    const tx = await contract.registerWallet(wallet.address, orgId, categories);
    const receipt = await tx.wait();
    console.log(`${label}: ${wallet.address} registered in block ${receipt.blockNumber}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

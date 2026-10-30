/**
 * Deploy TrustChainGovernance.
 *
 *   Local (in-process, no node needed):  npx hardhat run scripts/deploy.js
 *   Polygon Amoy (hosted RPC):           npx hardhat run scripts/deploy.js --network amoy
 *
 * Optional env:
 *   TRUSTCHAIN_ADMIN_ADDRESS      defaults to the deployer
 *   TRUSTCHAIN_REGISTRAR_ADDRESS  defaults to the deployer
 *   DEPLOY_CONFIRMATIONS          defaults to 2 on live networks, 1 locally
 *
 * Writes deployments/<network>.json (address, tx hash, block, ABI) so the
 * backend can load the real deployment. Nothing is fabricated: values come from
 * the actual transaction receipt.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer account configured. Check DEPLOYER_PRIVATE_KEY in .env");

  const admin = process.env.TRUSTCHAIN_ADMIN_ADDRESS || deployer.address;
  const registrar = process.env.TRUSTCHAIN_REGISTRAR_ADDRESS || deployer.address;
  for (const [label, addr] of [["admin", admin], ["registrar", registrar]]) {
    if (!ethers.isAddress(addr)) throw new Error(`Invalid ${label} address: ${addr}`);
  }

  const isLive = network.name !== "hardhat" && network.name !== "localhost";
  const confirmations = Number(process.env.DEPLOY_CONFIRMATIONS || (isLive ? 2 : 1));
  const { chainId } = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network:    ${network.name} (chainId ${chainId})`);
  console.log(`Deployer:   ${deployer.address}`);
  console.log(`Balance:    ${ethers.formatEther(balance)} native`);
  console.log(`Admin:      ${admin}`);
  console.log(`Registrar:  ${registrar}`);

  if (isLive && balance === 0n) {
    throw new Error("Deployer has zero balance. Fund it with Amoy test POL from a faucet first.");
  }

  const Factory = await ethers.getContractFactory("TrustChainGovernance");
  let overrides = {};
  if (isLive) {
    const feeData = await ethers.provider.getFeeData();
    const minPriorityFee = ethers.parseUnits("30", "gwei");
    const priorityFee = feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > minPriorityFee
      ? feeData.maxPriorityFeePerGas
      : minPriorityFee;
    const maxFee = feeData.maxFeePerGas && feeData.maxFeePerGas > priorityFee
      ? feeData.maxFeePerGas + ethers.parseUnits("2", "gwei")
      : priorityFee + ethers.parseUnits("5", "gwei");
    overrides = { maxPriorityFeePerGas: priorityFee, maxFeePerGas: maxFee };
    console.log(`Gas config: priorityFee=${ethers.formatUnits(priorityFee, "gwei")} gwei, maxFee=${ethers.formatUnits(maxFee, "gwei")} gwei`);
  }

  const contract = await Factory.deploy(admin, registrar, overrides);
  const deployTx = contract.deploymentTransaction();
  console.log(`Deploy tx:  ${deployTx.hash} (waiting for ${confirmations} confirmation(s)...)`);

  const receipt = await deployTx.wait(confirmations);
  if (!receipt || receipt.status !== 1) throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);

  const address = await contract.getAddress();
  const code = await ethers.provider.getCode(address);
  if (code === "0x") throw new Error(`No bytecode found at ${address}`);

  console.log(`Contract:   ${address}`);
  console.log(`Block:      ${receipt.blockNumber}`);
  console.log(`Gas used:   ${receipt.gasUsed}`);

  const artifact = await hre.artifacts.readArtifact("TrustChainGovernance");
  const record = {
    contractName: "TrustChainGovernance",
    network: network.name,
    chainId: Number(chainId),
    address,
    deploymentTxHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    deployer: deployer.address,
    admin,
    registrar,
    confirmations,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  if (network.name === "hardhat") {
    console.log("In-process hardhat network: deployment record not persisted (ephemeral chain).");
    return;
  }

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));
  console.log(`Saved:      ${outFile}`);
  console.log(`\nSet TRUSTCHAIN_CONTRACT_ADDRESS=${address} in the backend .env`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

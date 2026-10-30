require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const {
  POLYGON_AMOY_RPC_URL,
  POLYGON_AMOY_CHAIN_ID,
  DEPLOYER_PRIVATE_KEY,
  POLYGONSCAN_API_KEY,
} = process.env;

const PRIVATE_KEY_RE = /^(0x)?[0-9a-fA-F]{64}$/;

const networks = {
  hardhat: { chainId: 31337 },
  localhost: {
    url: "http://127.0.0.1:8545",
    chainId: 31337,
  },
};

// Only register Amoy when real configuration is present. Nothing is hardcoded.
if (POLYGON_AMOY_RPC_URL && DEPLOYER_PRIVATE_KEY && PRIVATE_KEY_RE.test(DEPLOYER_PRIVATE_KEY)) {
  networks.amoy = {
    url: POLYGON_AMOY_RPC_URL,
    chainId: Number(POLYGON_AMOY_CHAIN_ID || 80002),
    accounts: [DEPLOYER_PRIVATE_KEY.startsWith("0x") ? DEPLOYER_PRIVATE_KEY : `0x${DEPLOYER_PRIVATE_KEY}`],
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks,
  sourcify: {
    enabled: true,
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  mocha: { timeout: 60000 },
};

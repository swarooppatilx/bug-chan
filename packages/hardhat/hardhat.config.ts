import * as dotenv from "dotenv";
dotenv.config();
import { type HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import HardhatDeploy from "hardhat-deploy";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import hardhatTypechain from "@nomicfoundation/hardhat-typechain";
// If not set, it uses ours Alchemy's default API key.
// You can get your own at https://dashboard.alchemyapi.io
const providerApiKey = process.env.ALCHEMY_API_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
// If not set, it uses the hardhat account 0 private key.
// You can generate a random account with `yarn generate` or `yarn account:import` to import your existing PK
const deployerPrivateKey =
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// If not set, it uses our block explorers default API keys.
const etherscanApiKey = process.env.ETHERSCAN_V2_API_KEY || "DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin, HardhatDeploy, hardhatVerify, hardhatTypechain],
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: `https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
  },

  // Configuration for etherscan-verify from hardhat-deploy plugin
  verify: {
    etherscan: {
      apiKey: etherscanApiKey,
    },
  },
};

export default config;

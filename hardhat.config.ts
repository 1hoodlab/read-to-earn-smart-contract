import "dotenv/config";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import { HardhatUserConfig } from "hardhat/types";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import "@symfoni/hardhat-react";
import "hardhat-gas-reporter";

// * due to auto-generation the tests run much slower
// * unless this becomes opt-in, remove the comment out
// * to generate the new types
// * relating github issue: https://github.com/rhlsthrm/hardhat-typechain/issues/12
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

function node_url(networkName: string): string {
  if (networkName) {
    const uri = process.env[networkName.toUpperCase() + "_TESTNET_URL"];
    if (uri && uri !== "") {
      return uri;
    }
  }

  let uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace("{{networkName}}", networkName);
  }
  if (!uri || uri === "") {
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return "";
  }
  if (uri.indexOf("{{") >= 0) {
    throw new Error(
      `invalid uri or network not supported by nod eprovider : ${uri}`
    );
  }
  return uri;
}

function getMnemonic(networkName?: string): string {
  if (networkName) {
    const mnemonic = process.env["MNEMONIC_" + networkName.toUpperCase()];
    if (mnemonic && mnemonic !== "") {
      return mnemonic;
    }
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic || mnemonic === "") {
    return "test test test test test test test test test test test junk";
  }
  return mnemonic;
}
function accounts(networkName?: string): { mnemonic: string } {
  return { mnemonic: getMnemonic(networkName) };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    bsc: {
      url: node_url("bsc"),
      gas: 6_000_000,
      accounts: [process.env.DEPLOYER_ADDRESS as string],
      gasPrice: 50000000000,
    },
    polygon: {
      url: node_url("polygon"),
      accounts: accounts(),
      gas: 6_000_000,
      gasPrice: 50000000000,
    },
    ropsten: {
      url: node_url("ropsten"),
      accounts: accounts(),
      gas: 6_000_000,
      gasPrice: 50000000000,
    },
    goerli: {
      url: node_url("goerli"),
      accounts: accounts(),
      gas: 6_000_000,
      gasPrice: 50000000000,
    },
    // mainnet: {
    //   url: "https://eth-mainnet.alchemyapi.io/v2/<apiKey>",
    //   // to have a private key, just pass it in an array like so: ["0xprivKey"]
    //   accounts: ["<privKey>"],
    // },
  },
  paths: {
    sources: "./src",
  },
  mocha: {
    timeout: 0,
  },

  gasReporter: {
    currency: "USD",
    coinmarketcap: "78843e31-d97f-408c-9995-eb36d03905b5",
    token: "BNB",
  },
};

export default config;

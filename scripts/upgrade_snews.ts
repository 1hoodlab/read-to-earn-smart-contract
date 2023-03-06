import { ethers, upgrades } from "hardhat";

async function main() {
  const Snews = await ethers.getContractFactory("Snews");

  const SNEWS_CONTRACT_ADDRESS = process.env.SNEWS_CONTRACT_ADDRESS as string;

  console.log("Upgrade Snews...");
  await upgrades.upgradeProxy(SNEWS_CONTRACT_ADDRESS, Snews);
  console.log("Snews Upgrade to");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

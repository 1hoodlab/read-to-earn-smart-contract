import { ethers, upgrades } from "hardhat";

async function main() {
  const Snews = await ethers.getContractFactory("Snews");
  const RESOLVER_CONTRACT_ADDRESS = process.env
    .RESOLVER_CONTRACT_ADDRESS as string;
  console.log("Deploying...");
  const snews = await upgrades.deployProxy(Snews, [RESOLVER_CONTRACT_ADDRESS], {
    initializer: "__Snews_init",
  });
  await snews.deployed();
  console.log("Snews deployed to:", snews.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

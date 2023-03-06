import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";

async function main() {
  const Resolver = await ethers.getContractFactory("Resolver");
  console.log("Deploying Resolver...");
  const resolver = await Resolver.deploy();

  await resolver.deployed();

  const TokenUSDT = await ethers.getContractFactory("USDTToken");
  console.log("Deploying USDTToken...");

  const tokenUSDT = await TokenUSDT.deploy(parseEther("100000"));
  await tokenUSDT.deployed();

  console.log(
    `Resolver address: ${resolver.address} and TokenUSDT address: ${tokenUSDT.address}`
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

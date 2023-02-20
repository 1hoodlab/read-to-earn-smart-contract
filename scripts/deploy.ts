import { ethers } from "hardhat";

async function main() {
  const Hello = await ethers.getContractFactory("Hello");
  const helloContract = await Hello.deploy();

  await helloContract.deployed();

  console.log(`deployed to ${helloContract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

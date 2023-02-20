import chaiModule, { expect } from "chai";
import { waffleChai } from "@ethereum-waffle/chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Hello } from "../frontend/src/hardhat/typechain/Hello";
import { BigNumber } from "ethers";
chaiModule.use(waffleChai);
export = chaiModule;

describe("Hello.sol Contract Testing", () => {
  let owner: SignerWithAddress;
  let helloContract: Hello | any;
  context("Test Whoami function", () => {
    beforeEach(async () => {
      let signer = await ethers.getSigners();
      owner = signer[0];

      const HelloContract = await ethers.getContractFactory("Hello");
      helloContract = await HelloContract.deploy();
    });
    it("Is reuturn 1", async () => {
      let value = await helloContract.connect(owner).whoami();
      expect(value).to.be.equal(BigNumber.from(1));
    });
  });
});

import { waffleChai } from "@ethereum-waffle/chai";
import { ethers } from "hardhat";
import { expect } from "./chai-setup";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { BigNumber } from "ethers";
import { Resolver } from "../frontend/src/hardhat/typechain/src/Resolver";

describe("Hello.sol Contract Testing", () => {
  let owner: SignerWithAddress;
  let resolverContract: Resolver;
  
  context("Test Whoami function", function () {
    beforeEach(async function () {
      let signer = await ethers.getSigners();
      owner = signer[0];
      this.ResolverContract = await ethers.getContractFactory("Resolver");
      resolverContract = await this.ResolverContract.deploy();
    });
    it("Set payment token", async function () {
      let tx = await resolverContract.setPaymentToken(
        1,
        ethers.constants.AddressZero
      );
      expect(owner.address).to.be.eq(tx.from);
    });
    it("Check duplicate", async function () {
      await expect(
        resolverContract.setPaymentToken(0, ethers.constants.AddressZero)
      ).to.be.revertedWith("ReNFT::cant set sentinel");
    });
  });
});

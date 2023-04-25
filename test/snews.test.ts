import { USDTToken } from "./../frontend/src/hardhat/typechain/src/TokenUSDT.sol/USDTToken";
import { Snews } from "./../frontend/src/hardhat/typechain/src/Snews";
import { waffleChai } from "@ethereum-waffle/chai";
import { ethers, upgrades } from "hardhat";
import { expect } from "./chai-setup";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import { Contract } from "ethers";
import { Resolver } from "../frontend/src/hardhat/typechain/src/Resolver";
import { ServerSignature } from "./server";

const USDT_TOKEN_ID = 1;

async function exportCeateNewsEvent(tx: any) {
  let txr = await tx.wait();
  let createNewsEvent = txr.events.filter(
    (event: any) => event.event === "CreateNews"
  )[0];
  const [tokenId, ownerAddress, slug, totalSupply, paymenToken] =
    createNewsEvent.args;
  return {
    tokenId,
    ownerAddress,
    slug,
    totalSupply,
    paymenToken,
  };
}

describe("Hello.sol Contract Testing", function () {
  let owner: SignerWithAddress;
  let root: SignerWithAddress;
  let reader: SignerWithAddress;


  let snewsContract: Snews | Contract;
  
  let resolverContract: Resolver | Contract;
  let tokenUSDTContract: USDTToken | Contract;
  context("Test Snews function", function () {
    beforeEach(async function () {
      let signer = await ethers.getSigners();
      owner = signer[0];
      root = signer[1];
      reader = signer[2];

      this.SnewsContract = await ethers.getContractFactory("Snews");

      this.ResolverContract = await ethers.getContractFactory("Resolver");
      resolverContract = await this.ResolverContract.deploy();

      this.USDTToken = await ethers.getContractFactory("USDTToken");
      tokenUSDTContract = await this.USDTToken.deploy(
        ethers.utils.parseEther("100")
      );

      snewsContract = await upgrades.deployProxy(
        this.SnewsContract,
        [resolverContract.address, "v1.0"],
        { initializer: "__Snews_init" }
      );
      snewsContract.deployed();

      await resolverContract
        .connect(owner)
        .setPaymentToken(1, tokenUSDTContract.address);
    });
    it("Set Signer when set signer not owner", async function () {
      await expect(
        snewsContract.connect(root).setSigner(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Create news with 35 USDT", async function () {
      const slug = "lorem-spidreum";
      //
      await tokenUSDTContract
        .connect(owner)
        .approve(snewsContract.address, ethers.utils.parseEther("35"));

      let tx = await snewsContract
        .connect(owner)
        .createNews(slug, USDT_TOKEN_ID, ethers.utils.parseEther("35"));

      const eventData = await exportCeateNewsEvent(tx);

      expect(eventData.tokenId).to.be.equal(0);
      expect(eventData.ownerAddress).to.be.equal(owner.address);
      expect(eventData.slug).to.be.eq(slug);
      expect(eventData.totalSupply).to.be.eq(ethers.utils.parseEther("35"));
      expect(eventData.paymenToken).to.be.eq(1);
    });
    it("dupplicate slug", async function () {
      let slug = "lorem-spidreum";
      await snewsContract.connect(owner).createNews(slug, USDT_TOKEN_ID, 0);

      await expect(
        snewsContract.connect(owner).createNews(slug, USDT_TOKEN_ID, 0)
      ).to.be.revertedWith("The Slug was used by other people!");
    });

    it("Claim news", async function () {
      const slug = "lorem-spidreum";
      //
      await tokenUSDTContract
        .connect(owner)
        .approve(snewsContract.address, ethers.utils.parseEther("35"));

      let tx = await snewsContract
        .connect(owner)
        .createNews(slug, USDT_TOKEN_ID, ethers.utils.parseEther("35"));

      const eventData = await exportCeateNewsEvent(tx);

      expect(eventData.tokenId).to.be.equal(0);
      expect(eventData.ownerAddress).to.be.equal(owner.address);
      expect(eventData.slug).to.be.eq(slug);
      expect(eventData.totalSupply).to.be.eq(ethers.utils.parseEther("35"));
      expect(eventData.paymenToken).to.be.eq(1);

      await snewsContract.connect(owner).setSigner(root.address);

      const signature = await ServerSignature(
        snewsContract.address,
        reader.address,
        "35",
        0,
        1,
        slug,
        root
      );

      await snewsContract
        .connect(reader)
        .claimToken(slug, signature.transaction_id, [
          0,
          signature.v,
          signature.r,
          signature.s,
        ]);
    });
    it("Create news with 0 USDT", async function () {
      const slug = "lorem-spidreum";
      let tx = await snewsContract
        .connect(owner)
        .createNews(slug, USDT_TOKEN_ID, 0);
      const eventData = await exportCeateNewsEvent(tx);

      expect(eventData.tokenId).to.be.equal(0);
      expect(eventData.ownerAddress).to.be.equal(owner.address);
      expect(eventData.slug).to.be.eq(slug);
      expect(eventData.totalSupply).to.be.eq(ethers.utils.parseEther("0"));
      expect(eventData.paymenToken).to.be.eq(1);
    });
  });
});

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
async function exportClaimToken(tx: any) {
  let txr = await tx.wait();
  let claimTokenEvent = txr.events.filter(
    (event: any) => event.event === "ClaimToken"
  )[0];
  const [tokenId, from, totalSupply, transactionId] = claimTokenEvent.args;
  return {
    tokenId,
    from,
    totalSupply,
    transactionId,
  };
}
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

describe("Snews.sol Contract Testing", function () {
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
        [resolverContract.address],
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
      const TOTAL_SUPPLY = "35";
      const TOKEN_ID = 0;
      const PAYMENT_TOKEN = 1;
      await tokenUSDTContract
        .connect(owner)
        .approve(snewsContract.address, ethers.utils.parseEther(TOTAL_SUPPLY));

      let tx = await snewsContract
        .connect(owner)
        .createNews(slug, USDT_TOKEN_ID, ethers.utils.parseEther(TOTAL_SUPPLY));

      const eventData = await exportCeateNewsEvent(tx);

      expect(eventData.tokenId).to.be.equal(TOKEN_ID);
      expect(eventData.ownerAddress).to.be.equal(owner.address);
      expect(eventData.slug).to.be.eq(slug);
      expect(eventData.totalSupply).to.be.eq(
        ethers.utils.parseEther(TOTAL_SUPPLY)
      );
      expect(eventData.paymenToken).to.be.eq(PAYMENT_TOKEN);

      const nonce = 0;
      await snewsContract.connect(owner).setSigner(root.address);
      const signature = await ServerSignature(
        snewsContract.address.toLowerCase(),
        reader.address.toLowerCase(),
        TOTAL_SUPPLY,
        TOKEN_ID,
        nonce,
        slug,
        root
      );

      let tx2 = await snewsContract
        .connect(reader)
        .claimToken(slug, signature.transaction_id, {
          v: signature.v,
          r: signature.r,
          s: signature.s,
          deadline: 0,
        });

      let claimEventData = await exportClaimToken(tx2);

      expect(claimEventData.tokenId).to.be.eq(TOKEN_ID);
      expect(claimEventData.from).to.be.eq(reader.address);
      expect(claimEventData.totalSupply).to.be.eq(
        ethers.utils.parseEther(TOTAL_SUPPLY)
      );
      expect(claimEventData.transactionId).to.be.eq("transaction#01");

      const readerBalance = await tokenUSDTContract.balanceOf(reader.address);
      // check reader's balance
      expect(readerBalance).to.be.eq(ethers.utils.parseEther(TOTAL_SUPPLY));
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

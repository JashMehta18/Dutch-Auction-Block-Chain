import { time, loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import { ethers, upgrades } from "hardhat";
import { getContractAddress } from "@ethersproject/address";
import { BigNumber } from "ethers";

describe("NFTDutchAuction", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTDutchAuctionSmartContract() {

    // Contracts are deployed using the first signer/account by default
    const [owner, tokenTransferAccount, otherAccount, otherAccount2] = await ethers.getSigners();
    const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");

    //Mint NFT on the owner's account
    const ERC20MyNFT = await ethers.getContractFactory("MNERC20");
    const erc20mynft = await ERC20MyNFT.deploy();

    const ERC721MyNFT = await ethers.getContractFactory("MyNFT");
    const erc721mynft = await ERC721MyNFT.deploy();

    //Mint NFT on the owner's account
    await erc721mynft.safeMint(owner.getAddress(), { gasLimit: 250000, value: ethers.utils.parseEther("1") });

    const erc20mynfttokenaddress = await erc20mynft.address;

    const erc721mynfttokenaddress = await erc721mynft.address;

    const upgradeNumber = "v1";

    console.log("mn address ", erc20mynfttokenaddress);
    // const nftdutchauction_deployed = await NFTDutchAuction.deploy(erc20technoclevertokenaddress, erc721technoclevertokenaddress, 1, 5, 100, 1);
    // const nftdutchauction = await NFTDutchAuction.deploy();
    const nftdutchauction = await upgrades.deployProxy(NFTDutchAuction, [upgradeNumber, erc20mynfttokenaddress, erc721mynfttokenaddress, 1, 100, 10, 10], {
      kind: 'uups', initializer: "initialize(string, address, address, uint256, uint256, uint256, uint256)",
      timeout: 0
    });
    await nftdutchauction.deployed();

    const nftdutchauctionaddress = await nftdutchauction.address;
    await erc721mynft.approve(nftdutchauctionaddress, 1);


    console.log("ERC20 Contract address is", erc20mynfttokenaddress);
    console.log("ERC721 Contract address is", erc721mynfttokenaddress);
    console.log("ERC721 Owner address is", await erc721mynft.owner());

    console.log("Owner address is", owner.address);

    console.log("Other Account address is", otherAccount.address);


    return { erc20mynfttokenaddress, erc721mynfttokenaddress, NFTDutchAuction, erc20mynft, erc721mynft, owner, otherAccount,otherAccount2, nftdutchauction, tokenTransferAccount, nftdutchauctionaddress };
  }
  describe("Deployment", function () {
    it("Creates MNNFT NFT Token Collection", async function () {
      const { otherAccount, erc20mynft, erc20mynfttokenaddress
      } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await erc20mynft.name()).to.exist;
      expect(await erc20mynft.name()).to.equal('MN Coin');
    });


    it("MNNFT Token is minted to owner", async function () {
      const { erc20mynft, owner } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await erc20mynft.balanceOf(owner.address)).to.equal("1000000");
    });


    it("MNNFT should'nt be able to any more tokens", async function () {
      const { erc20mynft, owner,erc721mynft } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(erc721mynft.safeMint(owner.getAddress(), { gasLimit: 250000, value: ethers.utils.parseEther("0.001") })).to.be.rejectedWith("Can't mint anymore tokens");
    });


    it("NFTDutchAuction is deployed and initial price is 100 (ERC20 Tokens)", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.calculatePrice()).to.equal("100");
    });


    it("Rejects bid if owner has insufficient token balance", async function () {
      const { otherAccount, nftdutchauction, erc20mynft, owner, erc721mynft, nftdutchauctionaddress, tokenTransferAccount } = await loadFixture(deployNFTDutchAuctionSmartContract);

      expect(await erc721mynft.approve(nftdutchauctionaddress, 1)).to.ok;

      expect(await erc20mynft.connect(otherAccount)
        .approve(nftdutchauctionaddress, 100000)).to.ok;

      expect(await erc20mynft.transfer(otherAccount.address, 10)).to.ok;

      expect(await erc20mynft.balanceOf(otherAccount.address)).to.equal(10);

      expect(await erc20mynft.balanceOf(owner.address)).to.equal(999990);

      console.log("Owner address is", owner.address);

      console.log("Other Account address is", otherAccount.address);

      console.log("Token Transfer Account address is", tokenTransferAccount.address);

      console.log("Allowance from other acc to contract", await erc20mynft.allowance(otherAccount.address, nftdutchauctionaddress));

      console.log("Allowance from contract acc to owner", await erc20mynft.allowance(nftdutchauctionaddress, owner.address));

      console.log("Allowance from contract to acc of tokens", await erc20mynft.allowance(nftdutchauctionaddress, tokenTransferAccount.address));

      const contractnew = await nftdutchauction.connect(otherAccount);
      expect(await erc20mynft.balanceOf(otherAccount.address)).to.equal(10);
      expect(await nftdutchauction.calculatePrice()).to.equal(100);

      await expect(contractnew
        .receiveMoney(140)).to.be.rejectedWith("Insufficient token balance");


    });



    it("Accepts 140 (ERC20) bid ", async function () {
      const { otherAccount, nftdutchauction, erc20mynft, owner, erc721mynft, nftdutchauctionaddress, tokenTransferAccount } = await loadFixture(deployNFTDutchAuctionSmartContract);

      expect(await erc721mynft.approve(nftdutchauctionaddress, 1)).to.ok;

      expect(await erc20mynft.connect(otherAccount)
        .approve(nftdutchauctionaddress, 100000)).to.ok;

      expect(await erc20mynft.transfer(otherAccount.address, 1000)).to.ok;

      expect(await erc20mynft.balanceOf(otherAccount.address)).to.equal(1000);

      expect(await erc20mynft.balanceOf(owner.address)).to.equal(999000);

      console.log("Owner address is", owner.address);

      console.log("Other Account address is", otherAccount.address);

      console.log("Token Transfer Account address is", tokenTransferAccount.address);

      console.log("Allowance from other acc to contract", await erc20mynft.allowance(otherAccount.address, nftdutchauctionaddress));

      console.log("Allowance from contract acc to owner", await erc20mynft.allowance(nftdutchauctionaddress, owner.address));

      console.log("Allowance from contract to acc of tokens", await erc20mynft.allowance(nftdutchauctionaddress, tokenTransferAccount.address));

      const contractnew = await nftdutchauction.connect(otherAccount);
      expect(await erc20mynft.balanceOf(otherAccount.address)).to.equal(1000);
      expect(await nftdutchauction.calculatePrice()).to.equal(100);

      expect(await contractnew
        .receiveMoney(140)).to.ok;

      expect(await erc20mynft.balanceOf(tokenTransferAccount.address)).to.equal(100);

      expect(await erc20mynft.balanceOf(otherAccount.address)).to.equal(900);


    });

    it("Mines 100 blocks to check reserve price is correct: 5", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(nftdutchauction.calculatePrice()).eventually.to.equal(100);
      mine(1000);
      await expect(nftdutchauction.getCurrentBlockNumber()).eventually.to.equal(1011);
      await expect(nftdutchauction.calculatePrice()).eventually.to.equal(100);
    });

    it("Supports correct interface", async function () {
      const { erc20mynft,erc721mynft } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(erc721mynft.supportsInterface("0x12345678")).eventually.to.equal(false);
    });

    it("Rejects lower value bid ", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(nftdutchauction.receiveMoney(1)).to.be.rejectedWith("Not enough ether sent.");
    });

    it("Checking before proxy, response of getMessage() function should be v1", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.getMessage()).to.equal('v1');
    });

    it("Checking after proxy, response of getMessage() function should be v2", async function () {
      const { nftdutchauction, NFTDutchAuction, erc20mynfttokenaddress, erc721mynfttokenaddress } = await loadFixture(deployNFTDutchAuctionSmartContract);
      const nftdutchauctionv2 = await upgrades.deployProxy(NFTDutchAuction, ["v2", erc20mynfttokenaddress, erc721mynfttokenaddress, 1, 100, 10, 10], {
        kind: 'uups', initializer: "initialize(string, address, address, uint256, uint256, uint256, uint256)",
        timeout: 0
      });
      await nftdutchauctionv2.deployed();
      expect(await nftdutchauctionv2.getMessage()).to.equal('v2');
    });     
    
    it("Reverts if the bidder has insufficient token balance", async function () {
      const { otherAccount, nftdutchauction, erc20mynft, owner, erc721mynft, nftdutchauctionaddress } = await loadFixture(deployNFTDutchAuctionSmartContract);

      expect(await erc721mynft.approve(nftdutchauctionaddress, 1)).to.ok;

      expect(await erc20mynft.connect(otherAccount).approve(nftdutchauctionaddress, BigNumber.from(100))).to.ok;

      const contract = await nftdutchauction.connect(otherAccount);

      const balanceBefore = await erc20mynft.balanceOf(otherAccount.address);
      const amount = balanceBefore.add(BigNumber.from(1));

      await expect(contract.receiveMoney(amount)).to.be.rejectedWith("Insufficient token balance");
    });
  });
    

});

import { time, loadFixture, mine } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { getContractAddress } from "@ethersproject/address";
import { BigNumber } from "ethers";


describe("NFTDutchAuction", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTDutchAuctionSmartContract() {

    // Contracts are deployed using the first signer/account by default
    const [owner, tokenTransferAccount, otherAccount] = await ethers.getSigners();
    const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");

    //Mint NFT on the owner's account
    const ERC20MyNFT = await ethers.getContractFactory("MNERC20");
    const erc20mynft = await ERC20MyNFT.deploy();

    const ERC721MyNFT = await ethers.getContractFactory("MyNFT");
    const erc721mynft = await ERC721MyNFT.deploy();

    //Mint NFT on the owner's account
    await erc721mynft.safeMint(owner.getAddress(), { gasLimit: 250000, value: ethers.utils.parseEther("1.0") });

    const erc20mynfttokenaddress = await erc20mynft.address;

    const erc721mynfttokenaddress = await erc721mynft.address;

    console.log("mn address ", erc20mynfttokenaddress);
    const nftdutchauction = await NFTDutchAuction.deploy(erc20mynfttokenaddress, erc721mynfttokenaddress, 1, 5, 100, 1);
    const nftdutchauctionaddress = await nftdutchauction.address;
    await erc721mynft.approve(nftdutchauctionaddress, 1);


    console.log("ERC20 Contract address is", erc20mynfttokenaddress);
    console.log("ERC721 Contract address is", erc721mynfttokenaddress);
    console.log("ERC721 Owner address is", await erc721mynft.owner());

    console.log("Owner address is", owner.address);

    console.log("Other Account address is", otherAccount.address);


    return { erc20mynft, erc721mynft, owner, otherAccount, erc20mynfttokenaddress, nftdutchauction, tokenTransferAccount, nftdutchauctionaddress };
  }
  describe("Deployment", function () {
    it("Creates MyNFT NFT Token Collection", async function () {
      const { otherAccount, erc20mynft, erc20mynfttokenaddress } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await erc20mynft.name()).to.exist;
      expect(await erc20mynft.name()).to.equal('MN Coin');
    });

    it("MyNFT Token is minted to owner", async function () {
      const { erc20mynft, owner } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await erc20mynft.balanceOf(owner.address)).to.equal("1000000");
    });


    it("NFTDutchAuction is deployed and initial price is 100 (ERC20 Tokens)", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.calculatePrice()).to.equal("100");
    });


    it("Accepts 100 (ERC20) bid ", async function () {
      const { otherAccount, nftdutchauction, erc20mynft, owner, erc721mynft, nftdutchauctionaddress, tokenTransferAccount } = await loadFixture(deployNFTDutchAuctionSmartContract);

      expect(await erc721mynft.approve(nftdutchauctionaddress, 1)).to.ok;

      expect(await erc20mynft.connect(otherAccount).approve(nftdutchauctionaddress, 100000)).to.ok;

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
      expect(await nftdutchauction.calculatePrice()).to.equal(97);

      expect(await contractnew.receiveMoney(100)).to.ok;

      expect(await erc20mynft.balanceOf(tokenTransferAccount.address)).to.equal(96);

      expect(await erc20mynft.balanceOf(otherAccount.address)).to.equal(904);

      expect(await erc20mynft.balanceOf(owner.address)).to.equal(999000);

    });

    it("Mines 100 blocks to check reserve price is correct: 5", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(nftdutchauction.calculatePrice()).eventually.to.equal(100);
      mine(1000);
      await expect(nftdutchauction.getCurrentBlockNumber()).eventually.to.equal(1005);
      await expect(nftdutchauction.calculatePrice()).eventually.to.equal(5);
    });

    it("Supports correct interface", async function () {
      const { erc721mynft } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(erc721mynft.supportsInterface("0x12345678")).eventually.to.equal(false);
    });

    it("Rejects lower value bid ", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(nftdutchauction.receiveMoney(1)).to.be.revertedWith("Not enough ether sent.");
    });

    it("Reverts if the bidder has insufficient token balance", async function () {
      const { otherAccount, nftdutchauction, erc20mynft, owner, erc721mynft, nftdutchauctionaddress } = await loadFixture(deployNFTDutchAuctionSmartContract);

      expect(await erc721mynft.approve(nftdutchauctionaddress, 1)).to.ok;

      expect(await erc20mynft.connect(otherAccount).approve(nftdutchauctionaddress, BigNumber.from(100))).to.ok;

      const contract = await nftdutchauction.connect(otherAccount);

      const balanceBefore = await erc20mynft.balanceOf(otherAccount.address);
      const amount = balanceBefore.add(BigNumber.from(1));

      await expect(contract.receiveMoney(amount)).to.be.revertedWith("Insufficient token balance");
    });

    it("Reverts when the sender has insufficient token balance", async function () {
      const { otherAccount, nftdutchauction, erc20mynft, owner, erc721mynft, nftdutchauctionaddress } = await loadFixture(deployNFTDutchAuctionSmartContract);
    
      // Set up insufficient token balance
      await erc20mynft.connect(otherAccount).approve(nftdutchauctionaddress, 100);
      await erc20mynft.transfer(otherAccount.address, 99); // Less than the required amount
    
      // Attempt to call the function
      await expect(nftdutchauction.connect(otherAccount).receiveMoney(100)).to.be.revertedWith("Insufficient token balance");
    });

  });


});


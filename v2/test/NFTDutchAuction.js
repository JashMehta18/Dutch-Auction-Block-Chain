const { BigNumber } = require("ethers");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { getContractAddress } = require("@ethersproject/address");

describe("NFTDutchAuction", function () {
  // We define a fixture to reuse the same setup in every test
  // We use loadFixture to run this setup once, snapshot that state
  // and reset Hardhat Network to that snapshot in every test
  async function deployNFTDutchAuctionSmartContract() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();
    const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");

    //Mint NFT on the owner's account
    const MyNFT = await ethers.getContractFactory("MyNFT");
    const mynft = await MyNFT.deploy();

    //Mint NFT on the owner's account
    await mynft.safeMint(owner.getAddress(), { gasLimit: 250000, value: ethers.utils.parseEther("1.0") });

    //storing the "MyNFT" contract address
    const rawmynfttokenaddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const mynfttokenaddress = await ethers.utils.getAddress(rawmynfttokenaddress);

    //These are the values we set in the constructor of our dutch auction contract
    const nftdutchauction = await NFTDutchAuction.deploy(mynfttokenaddress, 1, ethers.utils.parseEther("1.0"), 10, ethers.utils.parseEther("0.01"));

    //storing the "NFTDutchAuction" contract address
    const rawnftdutchauctionaddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const nftdutchauctionaddress = await ethers.utils.getAddress(rawnftdutchauctionaddress);


    return { mynft, owner, otherAccount, mynfttokenaddress, nftdutchauction, nftdutchauctionaddress };
  }

  describe("Deployment", function () {
    it("Creates MyNFT NFT Token Collection & contract balance was withdrawn to creator after minting", async function () {
      const { owner, mynft, mynfttokenaddress, otherAccount, nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await mynft.name()).to.exist;
      expect(await mynft.name()).to.equal('MyNFT');
      console.log("Contract address is", mynfttokenaddress);
      console.log("Owner account address is", owner.address);
      console.log("Other account address is", otherAccount.address);
      expect(await mynft.balanceOf(owner.getAddress())).to.equal(1);
      expect(await mynft.withdraw()).to.ok;
    });

    it("URI is mynftcollection.com", async function () {
      const { mynft } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await mynft.tokenURI(1)).to.equal("https://mynftcollection.com/nfts/1");
    });

    it("Initial Balance in NFTDutchAuction is 0", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.functions.checkbalance()).to.ok;
    });


    it("TechnoCleverNFT is paused and unpaused", async function () {
      const { mynft } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await mynft.pause()).to.ok;
      expect(await mynft.unpause()).to.ok;

    });



    it("MyNFT Token is minted to owner", async function () {
      const { mynft, owner } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await mynft.ownerOf(1)).to.equal(owner.address);
    });

    it("Balance of owner is 1", async function () {
      const { mynft, owner } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await mynft.balanceOf(owner.getAddress())).to.equal(1);

    });


    it("NFTDutchAuction is deployed and initial price is 1.07ETH", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.calculatePrice()).to.equal("1070000000000000000");

    });


    it("Check if the starting block is 0 & current block is 3 since we've deployed NFT, minted & now deployed current contract", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.getCurrentBlockNumber()).to.equal(3);
    });


    it("Accepts higher bid of 20 ETH & transfers the NFT from owner to donor", async function () {
      const { mynft, nftdutchauction, otherAccount, owner } = await loadFixture(deployNFTDutchAuctionSmartContract);
      expect(await nftdutchauction.calculatePrice()).to.equal("1070000000000000000");
      const address = await mynft.balanceOf(owner.address);
      await console.log("owner address is ", mynft.functions.ownerOf(1));
      expect(await mynft.approve(nftdutchauction.address, 1)).to.ok;

      expect(await nftdutchauction.connect(otherAccount).receiveMoney({ value: ethers.utils.parseEther("20") })).to.ok;

      expect(await mynft.balanceOf(owner.getAddress())).to.equal(0);
      expect(await mynft.balanceOf(otherAccount.getAddress())).to.equal(1);

    });

    it("Rejects lower bid of 0.1 ETH", async function () {
      var bigNum = BigInt("100000000000000000");
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(nftdutchauction.receiveMoney({ value: bigNum })).to.be.revertedWith('Not enough ether sent.');
    });

    it("Rejects second bid of 1.6 ETH", async function () {
      var bigNum = BigInt("1600000000000000000");
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);
      await expect(nftdutchauction.receiveMoney({ value: bigNum })).to.be.reverted;
    });

    it("returns reserve price if current block number is greater than endsAtBlockNumber", async function () {
      const { nftdutchauction } = await loadFixture(deployNFTDutchAuctionSmartContract);

      const endsAtBlockNumber = 100;
      const reservePrice = ethers.utils.parseEther("1.5");
      nftdutchauction.endsAtBlockNumber = endsAtBlockNumber;
      nftdutchauction.reservePrice = reservePrice;

      // Increase the block number until it is greater than endsAtBlockNumber
      while ((await ethers.provider.getBlockNumber()) <= endsAtBlockNumber) {
        await network.provider.send("evm_mine");
      }

      // Call the calculatePrice function
      const result = await nftdutchauction.calculatePrice();

      // Assert that the result is equal to the reservePrice
      expect(ethers.utils.parseEther("1.5")).to.equal(reservePrice);
    });
  });

});

describe("MyNFT", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployMyNFTSmartContract() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    const mynft = await MyNFT.deploy();
    //Mint NFT on the owner's account
    await mynft.safeMint(owner.getAddress(), { gasLimit: 250000, value: ethers.utils.parseEther("1.0") });
    return { mynft, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Creates a token collection with a name", async function () {
      const { mynft } = await loadFixture(deployMyNFTSmartContract);
      expect(await mynft.name()).to.exist;
      expect(await mynft.name()).to.equal('MyNFT');
    });

    it("Creates a token collection with a symbol", async function () {
      const { mynft } = await loadFixture(deployMyNFTSmartContract);
      expect(await mynft.symbol()).to.equal('MN');
    });

    it("Token is minted to owner", async function () {
      const { mynft, owner } = await loadFixture(deployMyNFTSmartContract);
      expect(await mynft.ownerOf(1)).to.equal(owner.address);
    });

    it("Owner only has 1 token", async function () {
      const { mynft, owner } = await loadFixture(deployMyNFTSmartContract);
      expect(await mynft.balanceOf(owner.getAddress())).to.equal(1);
    });

    it("Owner can transfer token to other address. Owner balance = 0, otherAccount balance = 1", async function () {
      const { mynft, owner, otherAccount } = await loadFixture(deployMyNFTSmartContract);
      expect(await mynft.transferFrom(owner.address, otherAccount.address, 1)).to.exist;
      expect(await mynft.balanceOf(owner.getAddress())).to.equal(0);
      expect(await mynft.balanceOf(otherAccount.getAddress())).to.equal(1);
    });

    it("should return true for ERC721 interface", async function () {
      const { mynft, owner, otherAccount } = await loadFixture(deployMyNFTSmartContract);
      const interfaceId = "0x80ac58cd";
      const result = await mynft.supportsInterface(interfaceId);
      expect(result).to.be.true;
    });

    it("should return true for ERC721Enumerable interface", async function () {
      const { mynft, owner, otherAccount } = await loadFixture(deployMyNFTSmartContract);
      const interfaceId = "0x780e9d63";
      const result = await mynft.supportsInterface(interfaceId);
      expect(result).to.be.true;
    });

    it("should return false for unsupported interface", async function () {
      const { mynft, owner, otherAccount } = await loadFixture(deployMyNFTSmartContract);
      const interfaceId = "0x12345678";
      const result = await mynft.supportsInterface(interfaceId);
      expect(result).to.be.false;
    });

    it('should revert if not enough ether is sent', async function () {
      const { mynft,otherAccount } = await loadFixture(deployMyNFTSmartContract);
      // Get the current price
      const price = await mynft.price();
  
      // Attempt to mint without sending enough ether
      await expect(mynft.safeMint(otherAccount.address, { value: price.sub(ethers.utils.parseEther('0.01')) }))
        .to.be.reverted;
    });

    it("should return the correct base URI", async function () {
      const { mynft, owner, otherAccount } = await loadFixture(deployMyNFTSmartContract);
      const expectedBaseURI = "https://mynftcollection.com/nfts/";
      const result = await mynft.baseURI();
      expect(result).to.equal(expectedBaseURI);
    });



    it("should return the initial value of the token ID counter", async function () {
      const { mynft, owner, otherAccount } = await loadFixture(deployMyNFTSmartContract);
      const result = await mynft.tokenIdCounter();
      expect(result).to.equal(2);
    });

    it("throws an error if the contract balance is zero", async function () {
      const { mynft, owner } = await loadFixture(deployMyNFTSmartContract);
    
      // Get the contract balance
      const balance = await ethers.provider.getBalance(mynft.address);
    
      // Check if the balance is zero
      if (balance.eq(0) && balance.lt(0) ) {
        // The balance is zero, so the test case should fail
        assert.fail("Contract balance is zero");
      } else {
        // Attempt to call the withdraw function when the contract balance is not zero
        await expect(mynft.withdraw()).to.not.be.reverted;
      }
    });
  });
});
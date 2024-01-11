//for time manipulation
const { time, loadFixture, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect, assert } = require("chai");


describe("Lock", function () {
  async function BasicDutchAuctiondeploy() {

    //retrieving ethereum accounts available on the currnt node
    const [owner, otherAccount] = await ethers.getSigners();

    const BasicDutchAuction = await ethers.getContractFactory("BasicDutchAuction");
    const basicdutchauction = await BasicDutchAuction.deploy();

    // get default signer which is owner
    signer = ethers.provider.getSigner(0);

    // get default signer, but just the address!
    [signerAddress] = await ethers.provider.listAccounts();
    return { basicdutchauction, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Check if the starting block is 0", async function () {
      //loadFixture deploys the contract
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      expect(await basicdutchauction.blocknumber()).to.equal(1);
    });

    it("check if contract has been initialized correctly", async function () {
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      expect(await basicdutchauction.initialPrice()).to.equal(ethers.utils.parseEther("1.6"));
      expect(await basicdutchauction.reservePrice()).to.equal(ethers.utils.parseEther("1.5"));
      expect(await basicdutchauction.offerPriceDecrement()).to.equal(ethers.utils.parseEther("0.01"));
      expect(await basicdutchauction.numBlocksAuctionOpen()).to.equal(10);
      expect(await basicdutchauction.owner()).to.equal(owner.address);
    });

    it("Check if the initialPrice is 1600000000000000000 wei", async function () {
      var bigNum = BigInt("1600000000000000000");
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      expect(await basicdutchauction.initialPrice()).to.equal(bigNum);
    });

    it("Check if Rejects lower bid", async function () {
      var bigNum = BigInt("1400000000000000000");
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      await expect(basicdutchauction.receiveMoney({ value: bigNum })).to.be.revertedWith('Not enough ether sent.');
    });

    it("Check if Rejects second bid ", async function () {
      var bigNum = BigInt("1600000000000000000");
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      await expect(basicdutchauction.receiveMoney({ value: bigNum })).eventually.to.ok;
      await expect(basicdutchauction.receiveMoney({ value: bigNum })).to.be.revertedWith('Someone has already donated');
    });

    it("After block 10, price should be 1.5 ETH. Here, block number is 15", async function () {
      const priceBigNum = ethers.utils.parseEther("1.5");
      const { basicdutchauction } = await loadFixture(BasicDutchAuctiondeploy);
      
      // Mine blocks until reaching block 15
      for (let i = 0; i < 15; i++) {
        await mine();
      }
      
      const actualPrice = await basicdutchauction.getprice();
      expect(actualPrice).to.equal(priceBigNum);
    });
    

    it("Initial contract balance is 0", async function () {
      const ModifyVariable = await ethers.getContractFactory("BasicDutchAuction");
      const contract = await ModifyVariable.deploy();
      await contract.deployed();
      expect(await contract.checkbalance()).to.equal(0);
    });

    it("should revert when not enough ether is sent", async function () {
      const { basicdutchauction, owner, otherAccount } = await loadFixture(BasicDutchAuctiondeploy);
      const bidAmount = ethers.utils.parseEther("1");
      await expect(basicdutchauction.connect(otherAccount).receiveMoney({ value: bidAmount })).to.be.revertedWith(
        "Not enough ether sent."
      );
    });
    
    it("should keep the bid amount constant after the auction ends without meeting the reserve price", async function () {
      const { basicdutchauction, owner, otherAccount } = await loadFixture(BasicDutchAuctiondeploy);
      //we first set the bid amount
      const bidAmount = ethers.utils.parseEther("1.6");
      //now we make a bid
      await basicdutchauction.connect(otherAccount).receiveMoney({ value: bidAmount });
       // Increase the time by more than the number of blocks for the auction to end
      await time.increase(11 * 15);
      //now we Check if the bid amount remains the same
      expect(await basicdutchauction.initialPrice()).to.equal(bidAmount);
    });
    
    it("should accept a bid greater than the reserve price", async function () {
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      const bidAmount = ethers.utils.parseEther("1.6");
      await expect(basicdutchauction.receiveMoney({ value: bidAmount })).to.eventually.be.fulfilled;
    });
    
    it("should reject a bid less than the reserve price but greater than the initial price", async function () {
      const { basicdutchauction, owner } = await loadFixture(BasicDutchAuctiondeploy);
      const bidAmount = ethers.utils.parseEther("1.55");
      await expect(basicdutchauction.receiveMoney({ value: bidAmount })).to.be.revertedWith('Not enough ether sent.');
    });   

    it("should reject a bid less than the reserve price but greater than the initial price", async function () {
      const { basicdutchauction } = await loadFixture(BasicDutchAuctiondeploy);
      const bidAmount = ethers.utils.parseEther("1.55");
      await expect(basicdutchauction.receiveMoney({ value: bidAmount })).to.be.revertedWith('Not enough ether sent.');
      expect(await basicdutchauction.initialPrice()).to.not.equal(bidAmount);
    });

    it("should reject a bid greater than the initial price but less than the reserve price", async function () {
      const { basicdutchauction } = await loadFixture(BasicDutchAuctiondeploy);
      const initialPrice = await basicdutchauction.initialPrice();
      const reservePrice = await basicdutchauction.reservePrice();
      const bidAmount = initialPrice.add(reservePrice).div(2);
      await expect(basicdutchauction.receiveMoney({ value: bidAmount })).to.be.revertedWith('Not enough ether sent.');
      expect(await basicdutchauction.initialPrice()).to.not.equal(bidAmount);
    });

    it("should accept a bid equal to the initial price", async function () {
      const { basicdutchauction } = await loadFixture(BasicDutchAuctiondeploy);
      const initialPrice = await basicdutchauction.initialPrice();
      await expect(basicdutchauction.receiveMoney({ value: initialPrice })).to.eventually.be.fulfilled;
      expect(await basicdutchauction.initialPrice()).to.equal(initialPrice);
    });

    it("should reject a bid lower than the initial price", async function () {
      const { basicdutchauction } = await loadFixture(BasicDutchAuctiondeploy);
      const initialPrice = await basicdutchauction.initialPrice();
      const lowerBid = initialPrice.sub(ethers.utils.parseEther("0.01"));
      await expect(basicdutchauction.receiveMoney({ value: lowerBid })).to.be.reverted;
      expect(await basicdutchauction.initialPrice()).to.equal(initialPrice);
    });        
  });

});

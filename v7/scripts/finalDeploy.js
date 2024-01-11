const hre = require("hardhat");

async function main() {
  const chai = await hre.ethers.getContractFactory("chai");
  const DUTCHAUCTION = await hre.ethers.getContractFactory("BasicDutchAuction");

  const contract = await chai.deploy(); //instance of contract
  const deployprice = new hre.ethers.utils.parseEther("1.5");
  const offerpricedecrement = new hre.ethers.utils.parseEther("0.001");
  const dutchauctioncontract = await DUTCHAUCTION.deploy(deployprice, "10", offerpricedecrement); //instance of contract

  await contract.deployed();
  await dutchauctioncontract.deployed();
  console.log("Address of chai contract:", contract.address);
  console.log("Address of dutch auction contract:", dutchauctioncontract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

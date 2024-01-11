const { network, ethers } = require("hardhat");

async function main() {
  try {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Deploying to network:", network.name);

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy();

    const deploymentTransaction = await token.deployTransaction.wait();
    const deploymentHash = deploymentTransaction.hash;

    if (deploymentHash) {
      console.log("Token deployed to address:", token.address);
    } else {
      console.error("Error deploying contracts: Transaction failed or was not mined.");
    }
  } catch (error) {
    console.error("Error deploying contracts:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

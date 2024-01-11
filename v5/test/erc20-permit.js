const { expect } = require("chai")
const { ethers } = require("hardhat")

async function getPermitSignature(signer, token, spender, value, deadline) {
  const [nonce, name, version, chainId] = await Promise.all([
    token.nonces(signer.address),
    token.name(),
    "1",
    signer.getChainId(),
  ])

  return ethers.utils.splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      }
    )
  )
}
describe("VerifySignature", function () {
  it("Check signature", async function () {
    const accounts = await ethers.getSigners(2)

    const VerifySignature = await ethers.getContractFactory("VerifySignature")
    const contract = await VerifySignature.deploy()
    await contract.deployed()

    const signer = accounts[0]
    const to = accounts[1].address
    const amount = 999
    const message = "Hello"
    const nonce = 123

    const hash = await contract.getMessageHash(to, amount, message, nonce)
    const sig = await signer.signMessage(ethers.utils.arrayify(hash))

    const ethHash = await contract.getEthSignedMessageHash(hash)

    console.log("signer          ", signer.address)
    console.log("recovered signer", await contract.recoverSigner(ethHash, sig))

    // Correct signature and message returns true
    expect(
      await contract.verify(signer.address, to, amount, message, nonce, sig)
    ).to.equal(true)

    // Incorrect message returns false
    expect(
      await contract.verify(signer.address, to, amount + 1, message, nonce, sig)
    ).to.equal(false)
  })
})

describe("ERC20Permit", function () {
  it("ERC20 permit", async function () {
    const accounts = await ethers.getSigners(1)
    const signer = accounts[0]

    const Token = await ethers.getContractFactory("MNERC20")
    const token = await Token.deploy()
    await token.deployed()

    const Vault = await ethers.getContractFactory("Vault")
    const vault = await Vault.deploy(token.address)
    await vault.deployed()

    const amount = 1000
    await token.mint(signer.address, amount)

    const deadline = ethers.constants.MaxUint256

    const { v, r, s } = await getPermitSignature(
      signer,
      token,
      vault.address,
      amount,
      deadline
    )

    await vault.depositWithPermit(amount, deadline, v, r, s)
    expect(await token.balanceOf(vault.address)).to.equal(amount)
  })
})

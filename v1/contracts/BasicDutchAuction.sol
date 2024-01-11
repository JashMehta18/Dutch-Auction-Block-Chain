// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract BasicDutchAuction {
    uint256 public blocknumber;
    uint256 public offerprice = 0 ether;
    uint256 public initialPrice = 5 ether;
    uint256 public immutable startBlock;
    uint256 public immutable endBlock;
    uint256 public immutable reservePrice = 1.5 ether;
    uint256 public immutable offerPriceDecrement = 0.01 ether;
    uint256 public immutable numBlocksAuctionOpen = 10;
    address public donor;
    uint256 public finalPrice;
    address public immutable owner;
    address public contractAddress;

    constructor() {
        startBlock = block.number;
        endBlock = 10;
        initialPrice = reservePrice + numBlocksAuctionOpen*offerPriceDecrement;
        blocknumber = block.number;
        owner = msg.sender;
        contractAddress = address(this);
    }

    function getprice() public view returns (uint256) {
        //we check if the current BLOCK is greater than the end block
        if (endBlock < block.number) {
            return reservePrice;
        }
        //else we decrease the price during each subsequent block
        return initialPrice  - (block.number * offerPriceDecrement);

    }
    
    function checkbalance() public view returns (uint256) {
        return contractAddress.balance;
    }

    function receiveMoney() public payable {
        require(donor == address(0), "Someone has already donated");
       
        require(msg.value >= getprice(), "Not enough ether sent.");

        require(msg.value >= initialPrice, "Bid amount lower than initial price");

        
        donor = msg.sender;
        finalPrice = getprice();
        //here we send the bidding price to the owner
        (bool sentFinalPriceETH,) = owner.call{value:finalPrice}("");

        //checking if the price was sent successfully or not 
        require(sentFinalPriceETH, "Ether transfer to donor addrress is failed");

        //checking if any extra ethers were sent by the bidder to the owner
        if(msg.value > finalPrice){
            
        (bool sentRemainingETH,) = msg.sender.call{value:contractAddress.balance}("");
        require(sentRemainingETH, "Couldn't send remaining ether");
        }
    }
}
//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

contract Token {
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;

    uint256 public initPrice;

    uint256 public fixedAmount;
    
    address public owner;
    mapping (address => uint) public bidprices;
    uint auctionEndBlock;

    uint public currPrice;
    bool auctionEnded;
    address public bidWinner;
   
    bool isFinalized;
    uint public startBlock;

    constructor(uint256 _reservePrice, uint256 _numBlocksAuctionOpen, uint256 _offerPriceDecrement) {
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initPrice = reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
       
        owner = msg.sender;

        auctionEnded = false;
        auctionEndBlock = block.number + _numBlocksAuctionOpen;
        fixedAmount = 500;

        startBlock=1;

    }

    function bid(uint256 _bid) public payable {
        require(block.number <= auctionEndBlock, "Block has already ended.");

        startBlock +=1;

        require(!auctionEnded, "Auction has already ended.");

        currPrice = initPrice - offerPriceDecrement * (numBlocksAuctionOpen - startBlock);
        
        require(_bid >= currPrice, "Bid must be greater than or equal to the current price.");
        
         if ( _bid > currPrice && !auctionEnded){
            bidWinner = msg.sender;
            
            auctionEnded = true;
            }

     
    }


}
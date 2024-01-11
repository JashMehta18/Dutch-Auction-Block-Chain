// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;
import "hardhat/console.sol";

/* Use these values for constructor
    uint256 public immutable reservePrice = 1500000000000000000;
    uint256 public immutable numBlocksAuctionOpen = 10;
    uint256 public immutable offerPriceDecrement = 10000000000000000;
*/
contract BasicDutchAuction {
    uint256 public blocknumber;
    uint256 public offerprice = 0 ether;
    uint256 public initialPrice = 5 ether;
    address public winner;
    uint256 public immutable startAt;
    uint256 public immutable reservePrice;
    uint256 public immutable offerPriceDecrement;
    uint256 public immutable numBlocksAuctionOpen;
    address public donor;
    uint256 public finalPrice;
    address public immutable owner;
    address public contractAddress;

    constructor(
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) {
        startAt = block.number;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initialPrice =
            reservePrice +
            numBlocksAuctionOpen *
            offerPriceDecrement;
        blocknumber = block.number;
        owner = msg.sender;
        contractAddress = address(this);
    }

    function price() public view returns (uint256) {
        if (numBlocksAuctionOpen < block.number) {
            return reservePrice;
        }

        return initialPrice - (block.number * offerPriceDecrement);
    }

    function checkbalance() public view returns (uint256) {
        return contractAddress.balance;
    }

    function getWinner() public view returns (address) {
        return winner;
    }

    function receiveMoney() public payable {
        require(donor == address(0), "Someone has already donated");
        require(msg.value >= price(), "Not enough ether sent.");
        donor = msg.sender;
        finalPrice = price();
        (bool sentFinalPriceETH, ) = owner.call{value: finalPrice}("");
        require(
            sentFinalPriceETH,
            "Ether transfer to donor addrress is failed"
        );
        winner = msg.sender;
        // console.log("amount sent ", msg.value, "final price ", finalPrice);
        if (msg.value > finalPrice) {
            // console.log("amount to be transferred ", contractAddress.balance);
            (bool sentRemainingETH, ) = msg.sender.call{
                value: contractAddress.balance
            }("");
            require(sentRemainingETH, "Couldn't send remaining ether");
            // console.log("Balance after transfer ", contractAddress.balance);
        }
    }
}

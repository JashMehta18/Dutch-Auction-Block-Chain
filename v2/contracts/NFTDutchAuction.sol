// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


contract MyNFT is ERC721, ERC721Enumerable, Pausable, Ownable{
    //we keep track of token id
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    //this is the cost required to mint a token
    uint256 public price = 0.05 ether;

    //this indicates that only 1 token can be minted in this contract
    uint256 public MAX_SUPPLY = 1;

    //we increment token id everytime this contract is deployed
    constructor() ERC721("MyNFT", "MN") {
        _tokenIdCounter.increment();
    }
    //this allows the contract owner to withdraw the balance of the contract
    function withdraw() public onlyOwner {
      require(address(this).balance > 0, "Balance is zero");
      payable(owner()).transfer(address(this).balance);
    }

    //this is the base uri and then we append the token id to it
    function _baseURI() internal pure override returns (string memory) {
        return "https://mynftcollection.com/nfts/";
    }

    //the following 2 functions are for owner to pause or unpause the contract
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    //used to mint a new token
    function safeMint(address to) public payable{
        //checking if a the max supply is not already passed 
        require (totalSupply() < MAX_SUPPLY , "Can't mint anymore tokens");

        //checking if the buyer has sent enough ether
        require (msg.value >= price, "Not enough ether sent.");
        
        // now we mint a new token using the next token id by incrementing it
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        //this function is called and a newly minted token with new id is minted and
        //assigned to the bidder ie "to" address 
        _safeMint(to, tokenId);
    }

    //here we check if the contract is paused , and if paused it wont allow to transfer any tokens
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal whenNotPaused override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function baseURI() public pure returns (string memory) {
        return "https://mynftcollection.com/nfts/";
    }

   function tokenIdCounter() public view returns (uint256) {
     return _tokenIdCounter.current();
    }

}


contract NFTDutchAuction {

    uint256 public immutable initialPrice;
    uint256 public startAtBlockNumber;
    uint256 public immutable endsAtBlockNumber;
    //minimum price at which NFT can be sold
    uint256 public immutable reservePrice;
    uint256 public immutable offerPriceDecrement;
    //total number of blocks for which the auction is open
    uint256 public immutable numBlocksAuctionOpen;
    uint256 public finalPrice;
    IERC721 public immutable myNFTReference;
    uint public nftTokenId;
    address payable public immutable owner;
    address public donor;
    address payable public immutable contractAddress;

     constructor(address erc721TokenAddress, uint256 _nftTokenId, uint256 _reservePrice, uint256 _numBlocksAuctionOpen, uint256 _offerPriceDecrement) {
        startAtBlockNumber = block.number;
        endsAtBlockNumber = _numBlocksAuctionOpen;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initialPrice = reservePrice + numBlocksAuctionOpen*offerPriceDecrement;
        owner = payable(msg.sender);
        contractAddress = payable (address(this));
        //assigning the ERC721 token contract instance, to use any functions of ERC721 token contract
        myNFTReference = IERC721(erc721TokenAddress);
        nftTokenId = _nftTokenId;
    }

    //gets the current block number
    function getCurrentBlockNumber() public view returns (uint256) {
        return block.number;
    }

    function calculatePrice() public view returns (uint256) {
        if (block.number > endsAtBlockNumber) {
            return reservePrice;
        }

        return initialPrice  - (block.number * offerPriceDecrement);

    }

    //allows to check the balance of the contract
    function checkbalance() public view returns(uint256) {
        return contractAddress.balance;
    }

    function receiveMoney() public payable {
        finalPrice = calculatePrice();
        require(donor == address(0), "Someone has already bought the NFT");
        require(msg.value >= finalPrice, "Not enough ether sent.");

        if (msg.value > finalPrice){
        // extra amount sent to donor
        (bool status_soldRemainingETH,) = msg.sender.call{value:msg.value - finalPrice}("");
        console.log("Status ", status_soldRemainingETH, "extra amount to be transferred to sender address ", msg.value-finalPrice);

        }

        // amount sending to owner
        (bool status_SoldAtFinalPrice,) = owner.call{value:finalPrice}("");
        console.log("status ", status_SoldAtFinalPrice, " Balance after transfer ", contractAddress.balance);

        myNFTReference.transferFrom(myNFTReference.ownerOf(1), msg.sender, nftTokenId);

        donor = msg.sender;

    }
    
}
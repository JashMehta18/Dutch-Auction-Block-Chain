// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/*
    Set following values in constructor

    uint256 public reservePrice = 5;
    uint256 public numBlocksAuctionOpen = 10;
    uint256 public offerPriceDecrement = 1;
    uint public nftTokenId = 1;
*/

contract MNERC20 is ERC20 {
    constructor() ERC20("MN Coin", "MNERC20") {
        _mint(msg.sender, 1000000);
    }
}

contract MyNFT is ERC721, ERC721Enumerable, Pausable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    uint256 public price = 0.05 ether;
    uint256 public MAX_SUPPLY = 1;

    constructor() ERC721("MyNFT", "MN") {
        _tokenIdCounter.increment();
    }

    function safeMint(address to) public payable {
        require(totalSupply() < MAX_SUPPLY, "Can't mint anymore tokens");
        require(msg.value >= price, "Not enough ether sent.");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

contract NFTDutchAuction is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public initialPrice;
    uint256 public startAtBlockNumber;
    uint256 public endsAtBlockNumber;
    uint256 public reservePrice;
    uint256 public offerPriceDecrement;
    uint256 public numBlocksAuctionOpen;
    uint256 public finalPrice;
    IERC721 public myNFTReference;
    MNERC20 public myNFTERC20NFTReference;
    uint public nftTokenId;
    address payable public contractOwner;
    address public donor;
    address payable public contractAddress;
    mapping(address => uint256) public bidderTokens;
    uint256 public totalBidTokens;
    string public upgradeNumber;

    function initialize(
        string memory _upgradeNumber,
        address erc20TokenAddress,
        address erc721TokenAddress,
        uint256 _nftTokenId,
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        upgradeNumber = _upgradeNumber;
        startAtBlockNumber = block.number;
        endsAtBlockNumber = _numBlocksAuctionOpen;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initialPrice =
            reservePrice +
            numBlocksAuctionOpen *
            offerPriceDecrement;
        contractOwner = payable(msg.sender);
        contractAddress = payable(address(this));
        myNFTReference = IERC721(erc721TokenAddress);
        myNFTERC20NFTReference = MNERC20(erc20TokenAddress);
        nftTokenId = _nftTokenId;
    }

    function getCurrentBlockNumber() public view returns (uint256) {
        return block.number;
    }

    function calculatePrice() public view returns (uint256) {
        if (block.number > endsAtBlockNumber) {
            return reservePrice;
        }

        return initialPrice - (block.number * offerPriceDecrement);
    }

    function receiveMoney(uint256 amount) public payable {
        finalPrice = calculatePrice();
        require(
            myNFTERC20NFTReference.balanceOf(msg.sender) >= amount,
            "Insufficient token balance"
        );

        require(amount >= finalPrice, "Not enough ether sent.");

        myNFTERC20NFTReference.transferFrom(
            msg.sender,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            finalPrice
        );

        myNFTReference.transferFrom(
            myNFTReference.ownerOf(1),
            msg.sender,
            nftTokenId
        );

        donor = msg.sender;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function getMessage() public view returns (string memory) {
        return upgradeNumber;
    }
}

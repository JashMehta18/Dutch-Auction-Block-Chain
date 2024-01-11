// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "hardhat/console.sol";
import "@rari-capital/solmate/src/tokens/ERC20.sol";
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
    constructor() ERC20("MN Coin", "MNERC20", 18) {
        _mint(msg.sender, 1000000);
    }

    function mint(address _to, uint _amount) external {
        _mint(_to, _amount);
    }
}

interface IERC20Permit {
    function totalSupply() external view returns (uint);

    function balanceOf(address account) external view returns (uint);

    function transfer(address recipient, uint amount) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint);

    function approve(address spender, uint amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool);

    function permit(
        address owner,
        address spender,
        uint value,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}

contract VerifySignature {
    function getMessageHash(
        address _to,
        uint _amount,
        string memory _message,
        uint _nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_to, _amount, _message, _nonce));
    }

    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function verify(
        address _signer,
        address _to,
        uint _amount,
        string memory _message,
        uint _nonce,
        bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_to, _amount, _message, _nonce);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == _signer;
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}

contract Vault {
    IERC20Permit public immutable token;

    constructor(address _token) {
        token = IERC20Permit(_token);
    }

    function deposit(uint amount) external {
        token.transferFrom(msg.sender, address(this), amount);
    }

    function depositWithPermit(
        uint amount,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        token.permit(msg.sender, address(this), amount, deadline, v, r, s);
        token.transferFrom(msg.sender, address(this), amount);
    }
}

contract MyNFT is ERC721, ERC721Enumerable, Pausable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    uint256 public price = 0.05 ether;
    uint256 public MAX_SUPPLY = 1;

    constructor() ERC721("MyNFT", "MC") {
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

import React, { useState } from 'react';
import Web3 from 'web3';
import TokenArtifact from './artifacts/contracts/Token.sol/Token.json';


const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545'); // Replace with your Ethereum provider

function App() {
  const [reservePrice, setReservePrice] = useState(5);
  const [numBlocksAuctionOpen, setNumBlocksAuctionOpen] = useState(5);
  const [offerPriceDecrement, setOfferPriceDecrement] = useState(1);
  const [auctionAddress, setAuctionAddress] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [newAuctionAddress, setNewAuctionAddress] = useState('');
  const [winner, setWinner] = useState('');
  const [constructorParams, setConstructorParams] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [bidResult, setBidResult] = useState('');

  const handleDeploy = async () => {
    try {
      const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    console.log(deployer)

      const contractData = {
        reservePrice: reservePrice,
        numBlocksAuctionOpen: numBlocksAuctionOpen,
        offerPriceDecrement: offerPriceDecrement,
      };

      console.log(contractData)

      // Deploy the contract
      const deployedContract = await new web3.eth.Contract(TokenArtifact.abi)
        .deploy({ data: TokenArtifact.bytecode, arguments: [reservePrice, numBlocksAuctionOpen, offerPriceDecrement]})
        .send({ from: deployer, gas: 5000000 });

      // Update the newAuctionAddress state with the deployed contract address
      setNewAuctionAddress(deployedContract.options.address);
    } catch (error) {
      console.error('Error deploying contract:', error);
    }
  };

  const handleShowInfo = async () => {
    try {
      const contractAddress = auctionAddress;
  
      // Fetch contract instance using the contract address
      const contractInstance = new web3.eth.Contract(TokenArtifact.abi, contractAddress);
  
      // Fetch contract information
      const winner = await contractInstance.methods.bidWinner().call();
      const currentPriceWei = await contractInstance.methods.currPrice().call();

// Convert wei to Ether
const currentPriceEther = web3.utils.fromWei(currentPriceWei, 'ether');

// Display the current price in Ether
console.log("Current Price:", currentPriceEther, "ETH");

  
      // Update the states with the fetched values
      setWinner(winner);
      setCurrentPrice(currentPriceEther);
    } catch (error) {
      console.error('Error fetching contract information:', error);
    }
  };
  

  const handleBid = async () => {
    try {
      const contractAddress = auctionAddress;
      const bid = bidAmount;

      const accounts = await web3.eth.getAccounts();
      const bidder = accounts[0];


      // Fetch contract instance using the contract address
      const contractInstance = new web3.eth.Contract(TokenArtifact.abi, contractAddress);

      // Submit a bid to the contract
      await contractInstance.methods.bid(bid).send({ from: bidder, value: web3.utils.toWei(bid.toString(), 'ether') });

      // Update the bidResult state
      setBidResult('Bid accepted as the winner.');
    } catch (error) {
      console.error('Error submitting a bid:', error);
      setBidResult('Bid not accepted.');
    }
  };

  return (
    <div>
      <h1>Basic Dutch Auction UI</h1>

      <h2>Section 1: Deployment</h2>
      <label>Reserve Price:</label>
      <input type="number" value={reservePrice} onChange={(e) => setReservePrice(parseInt(e.target.value))} />
      <br />
      <label>Number of Blocks Auction Open:</label>
      <input
        type="number"
        value={numBlocksAuctionOpen}
        onChange={(e) => setNumBlocksAuctionOpen(parseInt(e.target.value))}
      />
      <br />
      <label>Offer Price Decrement:</label>
      <input
        type="number"
        value={offerPriceDecrement}
        onChange={(e) => setOfferPriceDecrement(parseInt(e.target.value))}
      />
      <br />
      <button onClick={handleDeploy}>Deploy</button>
      <br />
      <label>New Auction Address:</label>
      <p>{newAuctionAddress}</p>

      <h2>Section 2: Look up info on an auction</h2>
      <label>Auction Address:</label>
      <input type="text" value={auctionAddress} onChange={(e) => setAuctionAddress(e.target.value)} />
      <br />
      <button onClick={handleShowInfo}>Show Info</button>
      <br />
      <label>Winner:</label>
      <p>{winner}</p>
      
      <label>Current Price:</label>
      <p>{currentPrice}</p>

      <h2>Section 3: Submit a bid</h2>
      <label>Auction Address:</label>
      <input type="text" value={auctionAddress} onChange={(e) => setAuctionAddress(e.target.value)} />
      <br />
      <label>Bid Amount:</label>
      <input type="number" value={bidAmount} onChange={(e) => setBidAmount(parseInt(e.target.value))} />
      <br />
      <button onClick={handleBid}>Bid</button>
      <br />
      <label>Bid Result:</label>
      <p>{bidResult}</p>
    </div>
  );
}

export default App;

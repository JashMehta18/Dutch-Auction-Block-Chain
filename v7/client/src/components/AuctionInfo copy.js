import React, { useState } from "react";
import { ethers } from "ethers";
import contractAbi from "../contract/BasicDutchAuction.json";

const AuctionInfo = () => {
    const [contractAddress, setContractAddress] = useState("");
    const [auctionInfo, setAuctionInfo] = useState(null);
    const showInfo = async () => {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const auctionContract = new ethers.Contract(
                contractAddress,
                contractAbi.abi,
                signer
            );
            const winner = await auctionContract.winner;
            const reservePrice = await auctionContract.reservePrice();
            const numBlocksAuctionOpen = await auctionContract.numBlocksAuctionOpen();
            const offerPriceDecrement = await auctionContract.offerPriceDecrement();
            const currentPrice = await auctionContract.price();

            setAuctionInfo({
                winner,
                reservePrice,
                numBlocksAuctionOpen,
                offerPriceDecrement,
                currentPrice,
            });

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <label>
                Contract Address:
                <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                />
            </label>
            <button onClick={showInfo}>Show Info</button>

            {auctionInfo && (
                <div>
                    <p>Winner: {"0x0000000000000000000000000000000000000000" ? "Auction is still open" : auctionInfo.winner}</p>
                    <p>Reserve Price: {auctionInfo.reservePrice.toString()}</p>
                    <p>
                        Number of Blocks Auction Open:{" "}
                        {auctionInfo.numBlocksAuctionOpen.toString()}
                    </p>
                    <p>
                        Offer Price Decrement: {auctionInfo.offerPriceDecrement.toString()}
                    </p>
                    <p>Current Price: {auctionInfo.currentPrice.toString()}</p>

                </div>

            )}

        </div>
    );
};

export default AuctionInfo;

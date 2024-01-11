import React, { useState } from "react";
import contractAbi from "../contract/BasicDutchAuction.json";
import { ethers } from "ethers";

function Bid() {
    const [contractAddress, setContractAddress] = useState("");
    const [bidAmount, setBidAmount] = useState("");
    const [bidAccepted, setBidAccepted] = useState("");
    const BasicDutchAuction = contractAbi;

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(contractAddress, BasicDutchAuction.abi, signer);
            const price = await contract.price();
            if (ethers.utils.parseEther(bidAmount).gte(price)) {
                const tx = await contract.receiveMoney({
                    value: ethers.utils.parseEther(bidAmount)
                });
                await tx.wait();
                setBidAccepted("Your bid was accepted as the winner!");
            } else {
                setBidAccepted("Your bid was not accepted as the winner.");
            }
        } catch (error) {
            setBidAccepted("Invalid contract address.");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <br></br>
            <label>
                BasicDutchAuction address:
                <input type="text" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} />
            </label>
            <br />
            <label>
                Bid amount (in ETH):
                <input type="text" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
            </label>
            <br />
            <button type="submit">Bid</button>
            <br />
            {bidAccepted && <p>{bidAccepted}</p>}
        </form>
    );
}

export default Bid;

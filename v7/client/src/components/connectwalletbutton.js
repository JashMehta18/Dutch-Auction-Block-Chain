import React, { useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';

const injectedConnector = new InjectedConnector({
    supportedChainIds: [
        1, // Mainnet
        3, // Ropsten
        4, // Rinkeby
        5, // Goerli
        42, // Kovan
    ],
});

const ConnectWalletButton = ({ onConnect }) => {
    const { active, account, activate } = useWeb3React();
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        await activate(injectedConnector);
        onConnect();
    };

    if (active) {
        return <div>Connected to {account}</div>;
    }

    return (
        <button onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Connecting...' : 'Connect to MetaMask'}
        </button>
    );
};

export default ConnectWalletButton;

require('dotenv').config();
const fs = require('fs');

let walletFilepath = `./metadata/ganache_wallet.json`;
let ganache_wallet;
if (fs.existsSync(walletFilepath)) {
    ganache_wallet = JSON.parse(fs.readFileSync(walletFilepath, { encoding: 'utf-8' }));
}
walletFilepath = `./metadata/development_wallet.json`;
let development_wallet;
if (fs.existsSync(walletFilepath)) {
    development_wallet = JSON.parse(fs.readFileSync(walletFilepath, { encoding: 'utf-8' }));
}
walletFilepath = `./metadata/testnet_wallet.json`;
let testnet_wallet;
if (fs.existsSync(walletFilepath)) {
    testnet_wallet = JSON.parse(fs.readFileSync(walletFilepath, { encoding: 'utf-8' }));
}
walletFilepath = `./metadata/mainnet_wallet.json`;
let mainnet_wallet;
if (fs.existsSync(walletFilepath)) {
    mainnet_wallet = JSON.parse(fs.readFileSync(walletFilepath, { encoding: 'utf-8' }));
}


let addressFilepath = `./metadata/ganache_address.json`;
let ganache_address;
if (fs.existsSync(addressFilepath)) {
    ganache_address = JSON.parse(fs.readFileSync(addressFilepath, { encoding: 'utf-8' }));
    ganache_address = ganache_address.address;
}
addressFilepath = `./metadata/development_address.json`;
let development_address;
if (fs.existsSync(addressFilepath)) {
    development_address = JSON.parse(fs.readFileSync(addressFilepath, { encoding: 'utf-8' }));
    development_address = development_address.address;
}
addressFilepath = `./metadata/testnet_address.json`;
let testnet_address;
if (fs.existsSync(addressFilepath)) {
    testnet_address = JSON.parse(fs.readFileSync(addressFilepath, { encoding: 'utf-8' }));
    testnet_address = testnet_address.address;
}
addressFilepath = `./metadata/mainnet_address.json`;
let mainnet_address;
if (fs.existsSync(addressFilepath)) {
    mainnet_address = JSON.parse(fs.readFileSync(addressFilepath, { encoding: 'utf-8' }));
    mainnet_address = mainnet_address.address;
}


module.exports = {
    ganache: {
        rpc_endpoint : 'http://127.0.0.1:7545',
        start_time: 1613579313,
        account: ganache_wallet,
        staking_address: ganache_address,
        owner_address: '0x238F1746F5b5E31fF71306084324E26d922447d4',
    },
    development: {
        rpc_endpoint : 'http://127.0.0.1:8545',
        start_time: 1613579313,
        account: development_wallet,
        staking_address: development_address,
        owner_address: '0x238F1746F5b5E31fF71306084324E26d922447d4',
    },
    testnet: {
        rpc_endpoint : `${process.env.TESTNET_RPC_ENDPOINT}`,
        start_time: 1613579772,
        account: testnet_wallet,
        staking_address: testnet_address,
        owner_address: `${process.env.TESTNET_OWNER_ADDRESS}`,
        token_address: '0x98d9a611ad1b5761bdc1daac42c48e4d54cf5882',
    },
    mainnet: {
        rpc_endpoint : `${process.env.MAINNET_RPC_ENDPOINT}`,
        start_time: 1613579313,
        account: mainnet_wallet,
        staking_address: mainnet_address,
        owner_address: `${process.env.MAINNET_OWNER_ADDRESS}`,
        token_address: '0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f',
    },
};
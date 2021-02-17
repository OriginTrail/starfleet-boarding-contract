require('dotenv').config();

const Crypto = require('crypto');
const Web3 = require('web3');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

if (Object.hasOwnProperty('network')) {
    network = argv.network;
} else if (Object.keys(argv).length > 1) {
    network = Object.keys(argv).pop();
}

console.log(`Using network ${network}`);

if (!['testnet', 'mainnet', 'development', 'ganache'].includes(network)) {
    throw Error(`Network "${network}" is not supported!`);
}

// Load web3
let web3;
if (network === 'mainnet') {
    web3 = new Web3(new Web3.providers.HttpProvider(process.env.MAINNET_RPC_ENDPOINT));
} else if (network === 'testnet') {
    web3 = new Web3(new Web3.providers.HttpProvider(process.env.TESTNET_RPC_ENDPOINT));
} else if (network === 'ganache') {
    web3 = new Web3('http://127.0.0.1:7545');
} else if (network === 'development') {
    web3 = new Web3('http://127.0.0.1:8545');
}


async function main() {
    const walletFilepath = `../metadata/${network}_wallet.json`;
    if (fs.existsSync(walletFilepath)) {
        throw Error(`Wallet is already generated on ${network}, remove the file first if you want to generate a new one.`);
    }

    // Generate random seed
    const bytes = await Crypto.randomBytes(32);
    const seed = bytes.toString('hex');

    // console.log(`Using seed ${seed}`);

    // Create account using random seed
    const account = web3.eth.accounts.create(seed);
    // const account = {
    //     address: '0x5Fa3ae77f702f0F88EC097F79Cf369514Fa0b645',
    //     privateKey: '0x986c9a039a5f3cc5669e47f62fc2f0fc99338bfda4b89fdd3434b25f3ffa96a2',
    // };

    const nonce = await web3.eth.getTransactionCount(account.address);
    if (nonce !== 0) {
        console.log(`!!! Warning !!!`);
        console.log(`Generated account has a nonce of ${nonce}`);
    }

    const balance = await web3.eth.getBalance(account.address);
    if (parseInt(balance) !== 0) {
        console.log(`!!! Warning !!!`);
        console.log(`Generated account has balance of ${balance}`);
        return 1;
    }

    // Store in the metadata folder
    fs.writeFileSync(walletFilepath, JSON.stringify(account, null, 4));

    console.log(`Generated wallet for ${network}!`);
    return 0;
}


return main();
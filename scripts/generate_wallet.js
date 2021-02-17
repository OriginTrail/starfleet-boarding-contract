require('dotenv').config();

const Crypto = require('crypto');
const Web3 = require('web3');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

let network;
if (argv.hasOwnProperty('network')) {
    network = argv.network;
} else if (Object.keys(argv).length > 1) {
    network = Object.keys(argv).pop();
}

console.log(`Using network ${network}`);

if (!['testnet', 'mainnet', 'development', 'ganache'].includes(network)) {
    throw Error(`Network "${network}" is not supported!`);
}

const constants = require('../constants.js')[network];

// Load web3
const web3 = new Web3(new Web3.providers.HttpProvider(constants.rpc_endpoint));

async function main() {
    if (constants.account) {
        throw Error(`Wallet is already generated on ${network}, remove the file first if you want to generate a new one.`);
    }

    // Generate random seed
    const bytes = await Crypto.randomBytes(32);
    const seed = bytes.toString('hex');

    // console.log(`Using seed ${seed}`);

    // Create account using random seed
    const account = web3.eth.accounts.create(seed);

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
    const walletFilepath = `./metadata/${network}_wallet.json`;
    fs.writeFileSync(walletFilepath, JSON.stringify(account, null, 4));

    console.log(`Generated wallet for ${network}!`);
    return 0;
}


return main();
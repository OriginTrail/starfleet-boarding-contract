require('dotenv').config();

const Crypto = require('crypto');
const Web3 = require('web3');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

// Load network to be used

let network;
if (argv.hasOwnProperty('network')) {
    network = argv.network;
} else if (Object.keys(argv).length > 1) {
    network = Object.keys(argv).pop();
}
console.log(`Using network ${network}`);

// Verify that the network is okay to be used
if (!['testnet', 'mainnet', 'development', 'ganache'].includes(network)) {
    throw Error(`Network "${network}" is not supported!`);
}

const constants = require('../constants.js')[network];

// Load web3
const web3 = new Web3(new Web3.providers.HttpProvider(constants.rpc_endpoint));

// Load wallet
const wallet = constants.account;
if (!wallet) {
    throw Error(`Wallet does not exist for network "${network}"!`);
}

// Load contract data
//      Load contract abi
const stakeContractAbi = require('../build/contracts/StarfleetStake').abi;
//      Load contract address
const stakeContractAddress = constants.staking_address;
if (!stakeContractAddress) {
    throw Error(`Staking contract does not exist for network "${network}"!`);
}
//      Initialize smart contact
const stakeContract = new web3.eth.Contract(stakeContractAbi, stakeContractAddress);

function reportError(message, expected, actual) {
    console.log("=============== Error ================");
    console.log(`${message}`);
    if (expected && actual) {
        console.log(`\tExpected: ${expected}`);
        console.log(`\tActual: ${actual}`);
    }
    console.log(" ");
}

async function main() {
    const startTime = constants.start_time;

    const day = 24 * 3600;
    let checksFailed = 0;

    let tZero = await stakeContract.methods.t_zero().call();
    tZero = parseInt(tZero);
    console.log(`tZero: ${tZero}`);
    if (tZero !== startTime) {
        reportError('tZero does not match', startTime, tZero);
        checksFailed += 1;
    }

    let token_address = await stakeContract.methods.getTokenAddress().call();
    console.log(`token_address: ${token_address}`);
    if (token_address !== constants.token_address) {
        reportError('token_address does not match', constants.token_address, token_address);
        checksFailed += 1;
    }

    let boardingPeriodLength = await stakeContract.methods.BOARDING_PERIOD_LENGTH().call();
    boardingPeriodLength = parseInt(boardingPeriodLength);
    console.log(`boardingPeriodLength: ${boardingPeriodLength}`);
    if (boardingPeriodLength !== (30 * day)) {
        reportError(
            'Boarding period length is incorrect',
            (30 * day),
            boardingPeriodLength,
        );
        checksFailed += 1;
    }
    let lockPeriodLength = await stakeContract.methods.LOCK_PERIOD_LENGTH().call();
    lockPeriodLength = parseInt(lockPeriodLength);
    console.log(`lockPeriodLength: ${lockPeriodLength}`);
    if (lockPeriodLength !== (180 * day)) {
        reportError(
            'Lock period length is incorrect',
            (180 * day),
            lockPeriodLength,
        );
        checksFailed += 1;
    }
    let bridgePeriodLength = await stakeContract.methods.BRIDGE_PERIOD_LENGTH().call();
    bridgePeriodLength = parseInt(bridgePeriodLength);
    console.log(`bridgePeriodLength: ${bridgePeriodLength}`);
    if (bridgePeriodLength !== (180 * day)) {
        reportError(
            'Bridge period length is incorrect',
            (180 * day),
            bridgePeriodLength,
        );
        checksFailed += 1;
    }

    let boardingPeriodEnd = await stakeContract.methods.boarding_period_end().call();
    boardingPeriodEnd = parseInt(boardingPeriodEnd);
    console.log(`boardingPeriodEnd: ${boardingPeriodEnd}`);
    if (boardingPeriodEnd !== (tZero + (30 * day))) {
        reportError(
            'Boarding period end is incorrect',
            (tZero + (30 * day)),
            boardingPeriodEnd,
        );
        checksFailed += 1;
    }
    let lockPeriodEnd = await stakeContract.methods.lock_period_end().call();
    lockPeriodEnd = parseInt(lockPeriodEnd);
    console.log(`lockPeriodEnd: ${lockPeriodEnd}`);
    if (lockPeriodEnd !== (tZero +  ((30 + 180) * day))) {
        reportError(
            'Lock period end is incorrect',
            (tZero + ((30 + 180) * day)),
            lockPeriodEnd,
        );
        checksFailed += 1;
    }
    let bridgePeriodEnd = await stakeContract.methods.bridge_period_end().call();
    bridgePeriodEnd = parseInt(bridgePeriodEnd);
    console.log(`bridgePeriodEnd: ${bridgePeriodEnd}`);
    if (bridgePeriodEnd !== (tZero +  ((30 + 180 + 180) * day))) {
        reportError(
            'Bridge period end is incorrect',
            (tZero + ((30 + 180 + 180) * day)),
            bridgePeriodEnd,
        );
        checksFailed += 1;
    }

    let depositFailed = false;
    try {
        const data = stakeContract.methods.depositTokens(100000000).encodeABI();

        const createTransaction = await web3.eth.accounts.signTransaction({
            from: wallet.address,
            to: stakeContract.options.address,
            data,
            value: "0x00",
            gas: "400000",
            gasPrice: "100000000000",
        }, wallet.privateKey);
        const createReceipt = await web3.eth.sendSignedTransaction(createTransaction.rawTransaction);

    } catch (error) {
        depositFailed = true;
        // const expectedMessage = "Cannot deposit before staking starts";
        // if (!error.message.includes(expectedMessage)) {
        //    reportError(
        //        'Deposit failed but for the wrong reason',
        //        expectedMessage,
        //        error.message,
        //    );
        //     checksFailed += 1;
        // }
    }
    if (!depositFailed) {
        reportError('Deposit did not fail due to it being too early');
        checksFailed += 1;
    }

    let withdrawFailed = false;
    try {
        const data = stakeContract.methods.withdrawMisplacedEther().encodeABI();

        const createTransaction = await web3.eth.accounts.signTransaction({
            from: wallet.address,
            to: stakeContract.options.address,
            data,
            value: "0x00",
            gas: "400000",
            gasPrice: "100000000000",
        }, wallet.privateKey);
        const createReceipt = await web3.eth.sendSignedTransaction(createTransaction.rawTransaction);

    } catch (error) {
        withdrawFailed = true;
        // const expectedMessage = "Ownable: caller is not the owner";
        // if (!error.message.includes(expectedMessage)) {
        //     reportError(
        //         'OwnerOnly function failed but for the wrong reason',
        //         expectedMessage,
        //         error.message,
        //     );
        //     checksFailed += 1;
        // }
    }
    if (!withdrawFailed) {
        reportError('OwnerOnly function did not fail being called from a non-owner function');
        checksFailed += 1;
    }

    // Dodati proveru za owner-a
    const expectedOwner = constants.owner_address;
    const actualOwner = await stakeContract.methods.owner().call();
    console.log(`actualOwner ${actualOwner}`);
    if (expectedOwner.toLowerCase() !== actualOwner.toLowerCase()) {
        reportError('Owner does not match', expectedOwner.toLowerCase(), actualOwner.toLowerCase());
    }


    if (checksFailed > 0) {
        console.log(`${checksFailed} ${checksFailed > 1 ? 'tests' : 'test'} failed`);
        return 1;
    }

    return 0;
}

return main();

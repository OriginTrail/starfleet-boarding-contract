const fs = require('fs');

const StarfleetStake = artifacts.require("StarfleetStake");
const TestTraceToken = artifacts.require("TestTraceToken");

module.exports = function (deployer, network, accounts) {
    const constants = require('../constants.js')[network];
    if (constants.staking_address) {
        throw Error(`Contract is already deployed on ${network}, remove the file first before deployment`);
    }

    const startTime = constants.start_time;
    const tokenAddress = constants.token_address;
    const newOwner = constants.owner_address;
    const address_filepath = `./metadata/${network}_address.json`;

    if (network === 'ganache' || network === 'development') {
        deployer.deploy(TestTraceToken).then(function () {
            return deployer.deploy(StarfleetStake, startTime, TestTraceToken.address).then(async function (stakingContract) {
                await stakingContract.transferOwnership(newOwner);
                const data = { address: stakingContract.address };
                fs.writeFileSync(address_filepath, JSON.stringify(data, null, 4));
            });
        });
    }

    if (network === 'testnet') {
        // ATRAC deployment
        deployer.deploy(StarfleetStake, startTime, tokenAddress).then(async function (stakingContract) {
            await stakingContract.transferOwnership(newOwner);
            const data = { address: stakingContract.address };
            fs.writeFileSync(address_filepath, JSON.stringify(data, null, 4));
        });
    }

    if (network === 'mainnet') {
        // TRAC deployment
        deployer.deploy(StarfleetStake, startTime, tokenAddress).then(async function (stakingContract) {
            await stakingContract.transferOwnership(newOwner);
            const data = { address: stakingContract.address };
            fs.writeFileSync(address_filepath, JSON.stringify(data, null, 4));
        });
    }
};

const fs = require('fs');

const StarfleetStake = artifacts.require("StarfleetStake");
const TestTraceToken = artifacts.require("TestTraceToken");

module.exports = function (deployer, network, accounts) {
    const address_filepath = `./metadata/${network}_address.json`;
    if (fs.existsSync(address_filepath)) {
        throw Error(`Contract is already deployed on ${network}, remove the file first before deployment`);
    }

    if (network === 'ganache' || network === 'development') {
        deployer.deploy(TestTraceToken).then(function () {
            const startTime = Date.now() + 300;

            return deployer.deploy(StarfleetStake, startTime, TestTraceToken.address).then(async function (stakingContract) {
                await stakingContract.transferOwnership(accounts[2]);
                const data = { address: stakingContract.address };
                fs.writeFileSync(address_filepath, JSON.stringify(data, null, 4));
            });
        });
    }

    if (network === 'testnet') {
        // ATRAC deployment
        const startTime = Date.now() + 600;
        const testnetTokenAddress = '0x98d9a611ad1b5761bdc1daac42c48e4d54cf5882';
        const ownerWallet = '';

        deployer.deploy(StarfleetStake, startTime, testnetTokenAddress).then(async function (stakingContract) {
            await stakingContract.transferOwnership(ownerWallet);
            const data = { address: stakingContract.data };
            fs.writeFileSync(address_filepath, JSON.stringify(data, null, 4));
        });
    }

    if (network === 'mainnet') {
        // TRAC deployment
        const startTime = 1613571931;
        const mainnetTokenAddress = '0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f';
        const ownerWallet = '';

        deployer.deploy(StarfleetStake, startTime, mainnetTokenAddress).then(async function (stakingContract) {
            await stakingContract.transferOwnership(ownerWallet);
            const data = { address: stakingContract.data };
            fs.writeFileSync(address_filepath, JSON.stringify(data, null, 4));
        });
    }
};

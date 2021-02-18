const assert = require('assert');
const chai = require('chai');
chai.use(require('chai-bignumber')());
const ganache = require('ganache-cli');
const timeMachine = require('ganache-time-traveler');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
const BigNumber = web3.BigNumber;
const BN = require('bn.js');
const truffleAssert = require('truffle-assertions');
const TestTraceToken = artifacts.require("TestTraceToken");
const StarfleetStake = artifacts.require("StarfleetStake");
const Suicidal = artifacts.require("Suicidal");
const MultiSig = artifacts.require("MultiSigWallet");
const e18 = new web3.utils.toBN('1000000000000000000');
const million = new web3.utils.toBN('1000000').mul(e18);
const ETHER = e18;

const MIN_THRESHOLD = web3.utils.toBN('20').mul(million); //
const MAX_THRESHOLD = web3.utils.toBN('100').mul(million); //

let owner;
let stakingContract;
let token;
let dayInSeconds = 86400;
let BOARDING_PERIOD_LENGTH = 30 * dayInSeconds;
let LOCK_PERIOD_LENGTH = 180 * dayInSeconds;
let BRIDGE_PERIOD_LENGTH = 180 * dayInSeconds;

beforeEach(async () => {

	token = await TestTraceToken.deployed();
	stakingContract = await StarfleetStake.deployed();
	
});


contract('StarfleetStake', async function(accounts) {


	describe('Token holder deposit functionality checks ', function() {

		describe('StarfleetStake & Token basic checks', function() {
			it('Sanity check', async function() {
				assert( true === true, 'this is true');
			});

			it("Account 0 (Contract manager) should be owner", async () => {
				let owner = await stakingContract.owner.call();
				assert.equal(owner, accounts[0]);
			});

			it("Account 1 should not be owner", async () => {
				let owner = await stakingContract.owner.call();
				assert.notEqual(owner, accounts[1]);
			});

			it("Token address correct", async () => {
				let token_address = await stakingContract.getTokenAddress.call();
				assert.equal(token_address, token.address);
			});

			it("Contract manager cannot renounce ownership", async () => {
				await truffleAssert.reverts(stakingContract.renounceOwnership(),
					"Cannot renounce ownership of contract");
			});

			it("Contract manager can change ownership", async () => {
				let changeOfOwnership = await stakingContract.transferOwnership(accounts[1]);
				let newOwner = await stakingContract.owner.call();
				assert.equal(newOwner, accounts[1]);
			});


			it("Non-managers cannot change ownership", async () => {

				await truffleAssert.reverts( stakingContract.transferOwnership(accounts[1], {from: accounts[3]}) );
				
			});

			it('Cannot mistake TRAC address', async function() {
				let new_staking_contract = await StarfleetStake.new(0,"0x0000000000000000000000000000000000000000");
				let result = await truffleAssert.createTransactionResult(new_staking_contract, new_staking_contract.transactionHash);

				truffleAssert.eventEmitted(result, 'TokenAddressSet', {
					token_address: "0xaA7a9CA87d3694B5755f213B5D04094b8d0F0A6F"
				});
			});

			it("Staking contract should have 0 tokens at deployment", async () => {
				assert.equal(await token.balanceOf( stakingContract.address), 0);
			});

			it("Account 0 has totaly supply (for testing purposes)", async () => {
				let balance = await token.balanceOf(accounts[0]);
				let totalSupply = web3.utils.toBN('500000000000000000000000000');
				assert.equal(balance.eq(totalSupply), true );
			});

			it("Staking contract should not accept ETH", async () => {
				await truffleAssert.reverts(stakingContract.sendTransaction({value: ETHER}));
			});

		});


		describe('TH1 - Token holders must be able to deposit TRAC during the boarding period', function() {


			it('Token holders cannot try to deposit a zero amount',async function(){
				let approve = await token.approve(stakingContract.address, 1000, {from: accounts[0]});
				await truffleAssert.reverts( stakingContract.depositTokens(0, {from: accounts[0]}) );
			});

			it('Token holders cannot try to deposit if not enough tokens have been approved',async function(){
				let approve = await token.approve(stakingContract.address, 1000, {from: accounts[0]});
				await truffleAssert.reverts( stakingContract.depositTokens(2000, {from: accounts[0]}) );
			});

			it('Token holder can deposit 1000 tokens before boarding period has expired', async function() {
				assert.equal(await token.balanceOf( stakingContract.address), 0);
				let sendTokensToAccount3 = await token.transfer(accounts[3],1000, {from: accounts[0]});
				let approve = await token.approve(stakingContract.address, 1000, {from: accounts[3]});
				let deposit = await stakingContract.depositTokens(1000, {from: accounts[3]});


				assert.equal(await token.balanceOf( stakingContract.address), 1000);
				assert.equal(await stakingContract.getStake( accounts[3]), 1000);
				assert.equal(await stakingContract.getNumberOfParticipants(),1);

			});


			it('A token holder cannot deposit more than MAX_THRESHOLD tokens',async function() { 
				let sendTokensToAccount = await token.transfer(accounts[5], MAX_THRESHOLD, {from: accounts[0]});
				let balance = await token.balanceOf( accounts[5]);
				assert.equal(balance.eq(MAX_THRESHOLD), true );

				let approve = await token.approve(stakingContract.address, MAX_THRESHOLD, {from: accounts[5]});
				await truffleAssert.reverts( stakingContract.depositTokens(MAX_THRESHOLD, {from: accounts[5]}) );

				assert.equal(await token.balanceOf( stakingContract.address), 1000);

			} );


			it('Cannot deposit tokens before boarding period has started', async function() {
				let blockNumber = await web3.eth.getBlockNumber();
				let block = await web3.eth.getBlock(blockNumber);
				let start_time = block['timestamp'] + 1000000;
				let new_staking_contract = await StarfleetStake.new(start_time,token.address);

				await truffleAssert.reverts(
					new_staking_contract.depositTokens(2000, {from: accounts[1]}));

			});

			it('Cannot deposit tokens after boarding period has expired', async function() {

				await timeMachine.advanceTime(BOARDING_PERIOD_LENGTH);

				let sendTokensToAccount4 = await token.transfer(accounts[4],2000, {from: accounts[0]});
				let approve = await token.approve(stakingContract.address, 2000, {from: accounts[4]});
				assert.equal(await token.balanceOf( accounts[4]), 2000);
				await truffleAssert.reverts(
					stakingContract.depositTokens(2000, {from: accounts[4]}));

			});

		});

	});
});


contract('StarfleetStake', async function(accounts) {


	describe('TH2 Must be able withdraw TRAC before BOARDING_PERIOD_END and MIN_THRESHOLD not reached', function() {


		it('Can withdraw deposited TRAC before BOARDING_PERIOD_END, when MIN_THRESHOLD NOT reached',async function() { 

			assert.equal(await token.balanceOf( stakingContract.address), 0);
			let sendTokensToAccount1 = await token.transfer(accounts[1],1000, {from: accounts[0]});
			let approve = await token.approve(stakingContract.address, 1000, {from: accounts[1]});
			let deposit = await stakingContract.depositTokens(1000, {from: accounts[1]});

			assert.equal(await token.balanceOf( stakingContract.address), 1000);
			assert.equal(await stakingContract.getStake( accounts[1]), 1000);
			assert.equal(await stakingContract.getNumberOfParticipants(),1);

			let withdraw = await stakingContract.withdrawTokens({from: accounts[1]});
			assert.equal(await stakingContract.getStake( accounts[1]), 0);
			assert.equal(await stakingContract.getNumberOfParticipants(),0);
		});

		it('Cannot withdraw TRAC if there is no TRAC deposited',async function() {
			assert.equal(await stakingContract.getStake( accounts[2]), 0);
			await truffleAssert.reverts( stakingContract.withdrawTokens( {from: accounts[2]} ) );
		});


		it('Contract manager cannot transfer funds if minimum threshold not reached', async function(){
			const custodian = await MultiSig.new([accounts[0], accounts[1]], { from: accounts[0] });
			assert.equal(await stakingContract.isMinimumReached(), false);
			await truffleAssert.reverts( stakingContract.transferTokens(custodian.address ,{from : accounts[0]}) );

		});


		it('Contract manager cannot accountStarTRAC if minimum threshold not reached', async function(){
			let contributors = [ accounts[6], accounts[7] ];
			let amounts = [ 123 , 456];
			assert.equal(await stakingContract.isMinimumReached(), false);
			await truffleAssert.reverts( stakingContract.accountStarTRAC(contributors, amounts, {from : accounts[0]}) );

		});

		it('Contract manager cannot use fallbackWithdrawTokens before end of bridge period', async function(){

			assert.equal(await stakingContract.isMinimumReached(), false);
			await truffleAssert.reverts( stakingContract.fallbackWithdrawTokens({from : accounts[0]}) );

		});


		it('Withdrawing tokens updates the participant array correctly',async function() {
			await token.transfer(accounts[4],1000, {from: accounts[0]});
			await token.transfer(accounts[5],1000, {from: accounts[0]});
			await token.transfer(accounts[6],1000, {from: accounts[0]});
			assert.equal(await stakingContract.getStake( accounts[4]), 0);
			assert.equal(await stakingContract.getStake( accounts[5]), 0);
			assert.equal(await stakingContract.getStake( accounts[6]), 0);

			const initialPaticipants = await stakingContract.getParticipants();
			const account1Index = initialPaticipants.length;

			await token.approve(stakingContract.address, 1000, {from: accounts[4]});
			await stakingContract.depositTokens(1000, {from: accounts[4]});
			await token.approve(stakingContract.address, 1000, {from: accounts[5]});
			await stakingContract.depositTokens(1000, {from: accounts[5]});
			await token.approve(stakingContract.address, 1000, {from: accounts[6]});
			await stakingContract.depositTokens(1000, {from: accounts[6]});

			const secondParticipants = await stakingContract.getParticipants();
			const secondLength = secondParticipants.length;
			assert.equal(secondLength, initialPaticipants.length + 3);
			assert.equal(secondParticipants[secondLength - 3], accounts[4]);
			assert.equal(secondParticipants[secondLength - 2], accounts[5]);
			assert.equal(secondParticipants[secondLength - 1], accounts[6]);


			let withdraw = await stakingContract.withdrawTokens({from: accounts[4]});
			assert.equal(await stakingContract.getStake( accounts[4]), 0);

			const finalParticipants = await stakingContract.getParticipants();
			const finalLength = finalParticipants.length;
			assert.equal(finalParticipants.length, initialPaticipants + 2);
			// The last element of the array should be placed in the place of the deleted element
			assert.equal(finalParticipants[finalLength - 2], accounts[6]);
			assert.equal(finalParticipants[finalLength - 1], accounts[5]);

			withdraw = await stakingContract.withdrawTokens({from: accounts[5]});
			withdraw = await stakingContract.withdrawTokens({from: accounts[6]});
		});


		it('Cannot withdraw deposited TRAC when MIN_THRESHOLD reached',async function() { 
			let balance = await token.balanceOf( stakingContract.address);
			assert.equal(balance.eq(web3.utils.toBN('0')), true);

			let sendTokensToAccount2 = await token.transfer(accounts[2],MIN_THRESHOLD, {from: accounts[0]});
			let approve = await token.approve(stakingContract.address, MIN_THRESHOLD, {from: accounts[2]});
			let deposit = await stakingContract.depositTokens(MIN_THRESHOLD, {from: accounts[2]});

			balance = await token.balanceOf( stakingContract.address);
			assert.equal(balance.eq(MIN_THRESHOLD), true);
			assert.equal(await stakingContract.isMinimumReached(), true);

			let stake = await stakingContract.getStake( accounts[2]);
			assert.equal(stake.eq(MIN_THRESHOLD), true);
			assert.equal(await stakingContract.getNumberOfParticipants(),1);

			await truffleAssert.reverts( stakingContract.withdrawTokens( {from: accounts[2]} ) );

		} );	


		it('Contract manager cannot transfer funds to zero address', async function(){
			
			assert.equal(await stakingContract.isMinimumReached(), true);
			await truffleAssert.reverts( stakingContract.transferTokens("0x0000000000000000000000000000000000000000" ,{from : accounts[0]}) );

		});

		it('Cannot account starTRAC tokens before end of bridge period', async function(){
			
			assert.equal(await stakingContract.isMinimumReached(), true);

			let contributors = [ accounts[6], accounts[7] ];
			let amounts = [ 123 , 456];
			await truffleAssert.reverts( stakingContract.accountStarTRAC(contributors, amounts, {from : accounts[0]}) );
			
		});

		it('Contract manager cannot transfer funds before bridge launch window', async function(){

			await timeMachine.advanceTime(BOARDING_PERIOD_LENGTH);
			const custodian = await MultiSig.new([accounts[0], accounts[1]], { from: accounts[0] });
			await truffleAssert.reverts( stakingContract.transferTokens(custodian.address ,{from : accounts[0]}) );

		});


		it('Contract manager cannot transfer transfer funds during bridge launch window if the custodian is not a contract', async function(){
			let totalStakedBalance = await token.balanceOf( stakingContract.address);
			await timeMachine.advanceTime(LOCK_PERIOD_LENGTH);
			await truffleAssert.reverts(stakingContract.transferTokens(accounts[5],{from : accounts[0]}),
				"Cannot transfer tokens to custodian that is not a contract!");
		});


		it('Contract manager cannot transfer transfer funds during bridge launch window if the custodian does not have getOwners function', async function(){
			let totalStakedBalance = await token.balanceOf( stakingContract.address);
			await truffleAssert.reverts(stakingContract.transferTokens(token.address, { from: accounts[0]}),
				"Cannot transfer tokens to custodian without getOwners function!");
		});


		it('Contract manager cannot transfer transfer funds during bridge launch window if the custodian does not have owners', async function(){
			let totalStakedBalance = await token.balanceOf( stakingContract.address);
			const custodian = await MultiSig.new([], { from: accounts[0] });

			await truffleAssert.reverts(stakingContract.transferTokens(custodian.address, { from: accounts[0]}),
				"Cannot transfer tokens to custodian without owners defined!");
		});


		it('Contract manager can transfer funds during bridge launch window', async function(){
			let totalStakedBalance = await token.balanceOf( stakingContract.address);
			
			const custodian = await MultiSig.new([accounts[0], accounts[1]], { from: accounts[0] });
			await stakingContract.transferTokens(custodian.address,{from : accounts[0]}) ;
			
			balance = await token.balanceOf( stakingContract.address);
			assert.equal(balance.eq(web3.utils.toBN('0')), true);
			balance = await token.balanceOf( custodian.address);
			assert.equal(balance.eq(totalStakedBalance), true);
		});
	});

}); 

contract('StarfleetStake', async function(accounts) {
	describe('StarfleetStake & Token basic checks', function() {

		it('TH5 Must be able withdraw TRAC after BOARDING_PERIOD_LENGTH in case of MIN_THRESHOLD not reached',async function() { 

			assert.equal(await token.balanceOf( stakingContract.address), 0);
			let sendTokensToAccount1 = await token.transfer(accounts[1],1000, {from: accounts[0]});
			let approve = await token.approve(stakingContract.address, 1000, {from: accounts[1]});
			let deposit = await stakingContract.depositTokens(1000, {from: accounts[1]});
			assert.equal(await token.balanceOf( stakingContract.address), 1000);
			assert.equal(await stakingContract.getStake( accounts[1]), 1000);
			assert.equal(await stakingContract.getNumberOfParticipants(),1);
			await timeMachine.advanceTime(BOARDING_PERIOD_LENGTH);
			await stakingContract.withdrawTokens({from: accounts[1]}) ;
			let balance = await token.balanceOf( accounts[1]);
			assert.equal(balance.eq(web3.utils.toBN('1000')), true );

		});

	});

}); 


contract('StarfleetStake', async function(accounts) {

	before(async () => {

		token = await TestTraceToken.deployed();
		stakingContract = await StarfleetStake.deployed();
		// make sure min_threshold has been reached
		assert.equal(await stakingContract.isMinimumReached(), false);
		let sendTokensToAccount2 = await token.transfer(accounts[2],MIN_THRESHOLD, {from: accounts[0]});
		let approve = await token.approve(stakingContract.address, MIN_THRESHOLD, {from: accounts[2]});
		let deposit = await stakingContract.depositTokens(MIN_THRESHOLD, {from: accounts[2]});
		assert.equal(await stakingContract.isMinimumReached(), true);


	});


	it('Contract manager cannot transfer funds after bridge launch window', async function(){
		
		let approve = await token.approve(stakingContract.address, 1000, {from: accounts[0]});
		let deposit = await stakingContract.depositTokens(1000, {from: accounts[0]});
		await timeMachine.advanceTime(BOARDING_PERIOD_LENGTH + LOCK_PERIOD_LENGTH + BRIDGE_PERIOD_LENGTH);
		await truffleAssert.reverts( stakingContract.transferTokens(accounts[5],{from : accounts[0]}) );

	});

	it('accountStarTRAC reverts when arrays not the same length',async function() { 
		let contributors = [ accounts[6], accounts[7] ];
		let amounts = [ 123 ];
		await truffleAssert.reverts( stakingContract.accountStarTRAC(contributors, amounts, true, {from: accounts[0]}) );
		
	});


	it('Contract manager can account StarTRAC after bridge period (overwrite false)',async function() { 

		let contributors = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
		let amounts = [ 1000, 2000, 3000, 4000, 5000 ];
		await stakingContract.accountStarTRAC(contributors, amounts, false, {from: accounts[0]});
		let starTRACStake = await stakingContract.getStarTRACamount(accounts[3]);
		assert.equal( starTRACStake.eq(web3.utils.toBN('3000')), true); 
	});

	it('Contract manager can overwrite mistaken value (overwrite true)',async function() { 

		let contributors = [ accounts[3]];
		let amounts = [ 4000 ];

		starTRACStake = await stakingContract.getStarTRACamount(accounts[3]);
		assert.equal( starTRACStake.eq(web3.utils.toBN('3000')), true); 
		await stakingContract.accountStarTRAC(contributors, amounts, true, {from: accounts[0]});
		starTRACStake_new = await stakingContract.getStarTRACamount(accounts[3]);
		assert.equal( starTRACStake_new.eq(web3.utils.toBN('4000')), true); 
	});

	it('Contract manager cannot overwrite by accident (overwrite false)',async function() { 

		let contributors = [ accounts[3]];
		let amounts = [ 2999 ];

		starTRACStake = await stakingContract.getStarTRACamount(accounts[3]);
		assert.equal( starTRACStake.eq(web3.utils.toBN('4000')), true); 
		await stakingContract.accountStarTRAC(contributors, amounts, false, {from: accounts[0]});
		starTRACStake = await stakingContract.getStarTRACamount(accounts[3]);
		assert.equal( starTRACStake.eq(web3.utils.toBN('4000')), true); 
	});


	it('Token holder can claim StarTRAC when StarTRAC snapshot is available',async function() { 
		await stakingContract.fallbackWithdrawTokens({ from: accounts[1] });
		let StarTRACbalance = await stakingContract.getStarTRACamount( accounts[1]);
		assert.equal( StarTRACbalance.eq(web3.utils.toBN('0')), true); 
		let balance = await token.balanceOf( accounts[1]);
		assert.equal(balance.eq(web3.utils.toBN('1000')), true);
	});
	
	it('Token holder cannot claim StarTRAC twice',async function() { 
		let StarTRACbalance = await stakingContract.getStarTRACamount( accounts[1]);
		assert.equal( StarTRACbalance.eq(web3.utils.toBN('0')), true); 
		await truffleAssert.reverts(stakingContract.fallbackWithdrawTokens({ from: accounts[1] }));
	});


	it('Cannot withdraw TRAC with withdrawMisplacedTokens',async function() { 
		
		await truffleAssert.reverts(stakingContract.withdrawMisplacedTokens(token.address));
	});


	it('Can withdraw non-TRAC tokens with withdrawMisplacedTokens',async function() { 
		
		let another_token = await TestTraceToken.new();
		let balance = await another_token.balanceOf(accounts[0]);
		let totalSupply = web3.utils.toBN('500000000000000000000000000');
		assert.equal(balance.eq(totalSupply), true );
		await another_token.transfer(stakingContract.address, 123);
		let balance_of_contract = await another_token.balanceOf( stakingContract.address);
		await stakingContract.withdrawMisplacedTokens(another_token.address);
		balance_of_contract = await another_token.balanceOf( stakingContract.address);
		assert.equal(balance_of_contract.eq(web3.utils.toBN(0)), true);
	});


	it('In case of accidental Ether through selfDestruct, the withdrawMisplacedEther should be able to send to owner',async function() { 

		const suicidal_contract = await Suicidal.new([], { from: accounts[0] });
		let result = await suicidal_contract.sendTransaction({value: ETHER, from: accounts[0] })

		
		truffleAssert.eventEmitted(result, 'EthReceived');
		let initialContractBalance = await web3.eth.getBalance(suicidal_contract.address);
		initialContractBalance = new BN(initialContractBalance);

		await suicidal_contract.dieAndSendETH(stakingContract.address);

		let stakingContractBalance = await web3.eth.getBalance(stakingContract.address);
		stakingContractBalance = new BN(stakingContractBalance);
		assert(
			initialContractBalance.eq(stakingContractBalance), 
			`Incorrect balance of staking contract after selfDestruct.`
			+ `\n\tExpected: ${initialContractBalance.toString(10)}`
			+ `\n\tActual:  ${stakingContractBalance.toString(10)}`,
		);

		let initialBalance = await web3.eth.getBalance(accounts[0]);
		initialBalance = new BN(initialBalance);

		let tx = await stakingContract.withdrawMisplacedEther();
		truffleAssert.eventEmitted(tx, 'MisplacedEtherWithdrawn');

		let finalBalance = await web3.eth.getBalance(accounts[0]);
		finalBalance = new BN(finalBalance);


		assert(
			finalBalance.gt(initialBalance), 
			`Incorrect balance of owner wallet after ETH withdrawal.`
			+ `\n\tExpected balance to be greater than: ${initialBalance.toString(10)}`
		 	+ `\n\tActual balance is equal to: 			${finalBalance.toString(10)}`,
	 	);
	});
});
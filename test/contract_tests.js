const assert = require('assert');
const chai = require('chai');
chai.use(require('chai-bignumber')());
const ganache = require('ganache-cli');
const timeMachine = require('ganache-time-traveler');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const BigNumber = web3.BigNumber;
const BN = require('bn.js');
const truffleAssert = require('truffle-assertions');
const TestTraceToken = artifacts.require("TestTraceToken");
const StarfleetStake = artifacts.require("StarfleetStake");
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
				assert( true === true, 'this is true' )
			});

			it("Account 0 (Contract manager) should be owner", async () => {
				let owner = await stakingContract.owner.call();
				assert.equal(owner, accounts[0]);
			});

			it("Account 1 should not be owner", async () => {
				let owner = await stakingContract.owner.call();
				assert.notEqual(owner, accounts[1]);
			});

			it("Contract manager can change ownership", async () => {
				let changeOfOwnership = await stakingContract.transferOwnership(accounts[1]);
				let newOwner = await stakingContract.owner.call();
				assert.equal(newOwner, accounts[1]);
			});


			it("Non-managers cannot change ownership", async () => {

				await truffleAssert.reverts( stakingContract.transferOwnership(accounts[1], {from: accounts[3]}) );
				
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
				await truffleAssert.reverts(stakingContract.sendTransaction({amount: ETHER}));
			});

		});


		describe('TH1 - Token holders must be able to deposit TRAC during the boarding period', function() {


			it('Token holders cannot try to deposit a zero amount',async function(){
				let approve = await token.approve(stakingContract.address, 1000, {from: accounts[0]});
				await truffleAssert.reverts( stakingContract.depositTokens(0, {from: accounts[0]}) );
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


		it('Contract manager cannot transfer funds before bridge launch window', async function(){

			await timeMachine.advanceTime(BOARDING_PERIOD_LENGTH);
			await truffleAssert.reverts( stakingContract.transferTokens(accounts[5] ,{from : accounts[0]}) );

		});


		it('Contract manager can transfer funds during bridge launch window', async function(){
			let totalStakedBalance = await token.balanceOf( stakingContract.address);
			await timeMachine.advanceTime(LOCK_PERIOD_LENGTH);
			await  stakingContract.transferTokens(accounts[5],{from : accounts[0]}) ;
			balance = await token.balanceOf( stakingContract.address);
			assert.equal(balance.eq(web3.utils.toBN('0')), true);
			balance = await token.balanceOf( accounts[5]);
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

		} );

	});

}); 


contract('StarfleetStake', async function(accounts) {


	it('Contract manager cannot transfer funds after bridge launch window', async function(){
		
		let approve = await token.approve(stakingContract.address, 1000, {from: accounts[0]});
		let deposit = await stakingContract.depositTokens(1000, {from: accounts[0]});
		await timeMachine.advanceTime(BOARDING_PERIOD_LENGTH + LOCK_PERIOD_LENGTH + BRIDGE_PERIOD_LENGTH);
		await truffleAssert.reverts( stakingContract.transferTokens(accounts[5],{from : accounts[0]}) );

	});


	it('Contract manager can account StarTRAC after bridge period',async function() { 
		let contributors = [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5] ];
		let amounts = [ 1000,2000, 3000, 4000,5000 ];
		await stakingContract.accountStarTRAC(contributors, amounts, {from: accounts[0]});
		starTRACStake = await stakingContract.getStarTRACamount(accounts[1]);
		assert.equal( starTRACStake.eq(web3.utils.toBN('1000')), true); 
	} );


	it('Token holder can claim StarTRAC when StarTRAC snapshot is available',async function() { 
		await stakingContract.fallbackWithdrawTokens({ from: accounts[1] });
		let StarTRACbalance = await stakingContract.getStarTRACamount( accounts[1]);
		assert.equal( StarTRACbalance.eq(web3.utils.toBN('0')), true); 
		let balance = await token.balanceOf( accounts[1]);
		assert.equal(balance.eq(web3.utils.toBN('1000')), true);
	} );

}); 

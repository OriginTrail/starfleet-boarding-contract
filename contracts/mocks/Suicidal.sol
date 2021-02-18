pragma solidity 0.6.10;
contract Suicidal {

	event EthReceived(uint256 value); 
	receive () external payable {
		emit EthReceived(msg.value);
	}  
	function dieAndSendETH(address payable receiver) public payable { 
		selfdestruct(receiver); 
	}
}
pragma solidity 0.6.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract TestTraceToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 5e26;

    // for contract testing purposes, not to be confused with TRAC
    constructor() public ERC20("Test-Trace token", "T-TRAC") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}

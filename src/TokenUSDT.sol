// author: Hoando.
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDTToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("USD token", "USDT") {
        _mint(msg.sender, initialSupply);
    }
}

// author: Hoando.
// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.17;
import "./interface/IResolver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Resolver is IResolver, Ownable {
    mapping(uint8 => address) private addresses;

    function getPaymentToken(
        uint8 _pt
    ) external view override returns (address) {
        return addresses[_pt];
    }

    function setPaymentToken(
        uint8 _pt,
        address _v
    ) external override onlyOwner {
        require(_pt != 0, "ReNFT::cant set sentinel");
        require(
            addresses[_pt] == address(0),
            "ReNFT::cannot reset the address"
        );
        addresses[_pt] = _v;
    }
}

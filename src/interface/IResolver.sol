// author: Hoando.
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IResolver {
    enum PaymentToken {
        SENTINEL,
        BNB,
        USDC,
        WETH,
        DAI,
        USDT,
        TUSD,
        RENT,
        BSC
    }

    function getPaymentToken(uint8 _pt) external view returns (address);

    function setPaymentToken(uint8 _pt, address _v) external;
}

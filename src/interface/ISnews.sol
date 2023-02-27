// author: Hoando.
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

interface ISnews {
    struct EIP712Signature {
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct EIP712Domain {
        string name;
        string version;
        address verifyingContract;
    }

    struct News {
        uint256 tokenId;
        string slug;
        uint256 totalSupply;
        address owner;
    }

    event CreateNews(
        uint256 indexed tokenId,
        address indexed ownerAddress,
        string slug,
        uint256 totalSupply
    );

    event ClaimToken(
        uint256 indexed tokenId,
        address readerAddress,
        uint256 tokenValue,
        string transactionId
    );

    function createNews(string memory slug, uint256 totalSupply) external;

    function claimToken(
        string memory slug,
        string calldata transactionId,
        EIP712Signature calldata _signature
    ) external;
}

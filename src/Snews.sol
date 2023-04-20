// author: Hoando.
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "./interface/ISnews.sol";
import "./interface/IResolver.sol";

contract Snews is
    ISnews,
    Initializable,
    ERC721Upgradeable,
    ERC721HolderUpgradeable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    IResolver public resolver;
    address private signer;
    CountersUpgradeable.Counter private _newsIds;

    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    bytes32 private constant EIP712DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,address verifyingContract)"
        );

    bytes32 private constant CLAIM_TOKEN_TYPEHASH =
        keccak256(
            "Claim(address from,uint256 tokenId,uint256 nonce,uint256 value)"
        );

    bytes32 DOMAIN_SEPARATOR;

    mapping(bytes32 => News) public newsStorage;
    mapping(bytes32 => uint256) public newsFund;
    mapping(string => bool) public slugStorage;
    mapping(address => mapping(uint256 => bool)) public userClaimNews;
    mapping(address => uint256) public tokenWithDrawalNonces;
    
    string public version;

    function __Snews_init(
        address _resolver,
        string memory _version
    ) public initializer {
        __ERC721_init("News of Snews", "SNS");
        __Ownable_init();
        _setupRole(WRITER_ROLE, _msgSender());
        DOMAIN_SEPARATOR = _calculateDomainSeparator();
        resolver = IResolver(_resolver);
        version = _version;
    }

    function _msgSender() internal view virtual override returns (address) {
        return msg.sender;
    }

    function hash(
        EIP712Domain memory eip712Domain
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712DOMAIN_TYPEHASH,
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.verifyingContract
                )
            );
    }

    function hash(
        address from,
        uint256 tokenId,
        uint256 nonce,
        uint256 value
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(CLAIM_TOKEN_TYPEHASH, from, tokenId, nonce, value)
            );
    }

    function _calculateDomainSeparator() internal view returns (bytes32) {
        return
            hash(
                EIP712Domain({
                    name: "SNews",
                    version: version,
                    verifyingContract: address(this)
                })
            );
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return
            interfaceId == type(ISnews).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function createNews(
        string memory slug,
        uint8 _pt,
        uint256 totalSupply
    ) external override nonReentrant onlyRole(WRITER_ROLE) {
        require(!slugStorage[slug], "The Slug was used by other people!");
        if (totalSupply != 0) {
            _handleIncomingFund(totalSupply, resolver.getPaymentToken(_pt));
            newsFund[keccak256(abi.encodePacked(slug))] = totalSupply;
        }

        uint256 _tokenId = _newsIds.current();

        newsStorage[keccak256(abi.encodePacked(slug))] = News({
            tokenId: _tokenId,
            slug: slug,
            totalSupply: totalSupply,
            owner: _msgSender(),
            paymentToken: _pt
        });

        slugStorage[slug] = true;
        _safeMint(_msgSender(), _tokenId);
        _newsIds.increment();
        emit CreateNews(_tokenId, _msgSender(), slug, totalSupply, _pt);
    }

    function claimToken(
        string memory slug,
        string calldata transactionId,
        EIP712Signature calldata _signature
    ) external override nonReentrant {
        News memory currentNews = newsStorage[
            keccak256(abi.encodePacked(slug))
        ];

        require(
            !userClaimNews[_msgSender()][currentNews.tokenId],
            "user has claimed this news!"
        );
        require(currentNews.totalSupply != 0, "The News can't claim!");

        //reference: https://eips.ethereum.org/EIPS/eip-712
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hash(
                    _msgSender(),
                    currentNews.tokenId,
                    tokenWithDrawalNonces[_msgSender()]++,
                    currentNews.totalSupply
                )
            )
        );

        address recoveredAddress = ecrecover(
            digest,
            _signature.v,
            _signature.r,
            _signature.s
        );

        require(recoveredAddress == signer, "Signature invalid");

        _handleOutgoingFund(
            _msgSender(),
            currentNews.totalSupply,
            resolver.getPaymentToken(currentNews.paymentToken)
        );

        emit ClaimToken(
            currentNews.tokenId,
            _msgSender(),
            currentNews.totalSupply,
            transactionId
        );

        currentNews.totalSupply = 0;
    }

    function approveWriterRole(
        address account
    ) external override onlyOwner nonReentrant {
        _setupRole(WRITER_ROLE, account);
    }

    function _handleIncomingFund(uint256 amount, address currency) internal {
        if (currency == address(0)) {
            require(
                msg.value == amount,
                "Sent BNB Value does not match specified bid amount"
            );

            (bool isSuccess, ) = address(this).call{value: msg.value}("");
            require(isSuccess, "Transfer failed: gas error");
        } else {
            IERC20Upgradeable token = IERC20Upgradeable(currency);
            uint256 beforeBalance = token.balanceOf(address(this));
            token.safeTransferFrom(_msgSender(), address(this), amount);
            uint256 afterBalance = token.balanceOf(address(this));
            require(
                beforeBalance + amount == afterBalance,
                "Token transfer call did not transfer expected amount"
            );
        }
    }

    function _handleOutgoingFund(
        address to,
        uint256 amount,
        address currency
    ) internal {
        if (currency == address(0)) {
            (bool isSuccess, ) = to.call{value: amount}("");
            require(isSuccess, "Transfer failed: gas error");
        } else {
            IERC20Upgradeable(currency).safeTransfer(to, amount);
        }
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }
}

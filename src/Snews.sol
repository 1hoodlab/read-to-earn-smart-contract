// author: Hoando.
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;
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

    IResolver private resolver;

    CountersUpgradeable.Counter private _newsIds;

    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    bytes32 private constant EIP712DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,address verifyingContract)"
        );

    bytes32 private constant CLAIM_TOKEN_TYPEHASH =
        keccak256("Claim(address from, uint256 tokenId, uint256 value)");

    mapping(bytes32 => News) public newsStorage;
    mapping(bytes32 => uint256) public newsFund;
    mapping(string => bool) public slugs;

    function __Snews_init(address _resolver) public initializer {
        __ERC721_init("News of Snews", "SNS");
        __Ownable_init();
        _setupRole(WRITER_ROLE, _msgSender());

        resolver = IResolver(_resolver);
    }

    function _msgSender() internal view virtual override returns (address) {
        return msg.sender;
    }

    function hash(EIP712Domain memory eip712Domain)
        internal
        pure
        returns (bytes32)
    {
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
        uint256 value
    ) internal pure returns (bytes32) {
        return
            keccak256(abi.encode(CLAIM_TOKEN_TYPEHASH, from, tokenId, value));
    }

    function _calculateDomainSeparator() internal view returns (bytes32) {
        return
            hash(
                EIP712Domain({
                    name: "SNews",
                    version: "1.0",
                    verifyingContract: address(this)
                })
            );
    }

    function supportsInterface(bytes4 interfaceId)
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

    function createNews(string memory slug, uint256 totalSupply)
        external
        override
        nonReentrant
        onlyRole(WRITER_ROLE)
    {
        require(!slugs[slug], "Slug invalid!");
        if (totalSupply != 0) {
            _handleIncomingFund(
                totalSupply,
                resolver.getPaymentToken(uint8(IResolver.PaymentToken.USDT))
            );
            newsFund[keccak256(abi.encodePacked(slug))] = totalSupply;
        }

        uint256 _tokenId = _newsIds.current();

        newsStorage[keccak256(abi.encodePacked(slug))] = News({
            tokenId: _tokenId,
            slug: slug,
            totalSupply: totalSupply,
            owner: _msgSender()
        });

        slugs[slug] = true;
        _safeMint(_msgSender(), _tokenId);
        _newsIds.increment();
        emit CreateNews(_tokenId, _msgSender(), slug, totalSupply);
    }

    function claimToken(
        uint256 tokenId,
        string calldata transactionId,
        EIP712Signature calldata _signature
    ) external override nonReentrant {}

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
}

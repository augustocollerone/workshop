// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract ToketV3 is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Royalty,
    Pausable,
    AccessControl,
    ERC2771Context
{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    uint256 public _maxSupply;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINTER_ADMIN_ROLE = keccak256("MINTER_ADMIN_ROLE");

    event ToketV3Mint(address indexed _to, uint256 indexed _tokenId);

    constructor(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        address admin,
        address mintersAdmin,
        address[] memory minters,
        address royaltiesReceiver,
        uint96 royalties,
        address trustedForwarder
    ) ERC721(name, symbol) ERC2771Context(trustedForwarder) {
        _maxSupply = maxSupply;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ADMIN_ROLE, mintersAdmin);
        _setRoleAdmin(MINTER_ROLE, MINTER_ADMIN_ROLE);
        for (uint256 i = 0; i < minters.length; i++) {
            _grantRole(MINTER_ROLE, minters[i]);
        }
        _setDefaultRoyalty(royaltiesReceiver, royalties);
    }

    function safeMint(
        address to,
        string memory uri
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        if (_maxSupply >= 1) {
            require(totalSupply() < _maxSupply, "This NFT is sold out");
        }
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit ToketV3Mint(to, tokenId);
        return tokenId;
    }

    function safeMintWithRoyalties(
        address to,
        string memory uri,
        address royaltiesReceiver,
        uint96 royalties
    ) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = safeMint(to, uri);
        _setTokenRoyalty(tokenId, royaltiesReceiver, royalties);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

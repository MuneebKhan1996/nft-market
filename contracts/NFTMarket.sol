// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTMarket is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("B NFTs", "BNFT") {}

    //create NFT
    function createNFT(string calldata tokenURI) public returns (uint256) {
        _tokenIds.increment();
        uint256 currentTokenId = _tokenIds.current();
        _safeMint(msg.sender, currentTokenId);
        _setTokenURI(currentTokenId, tokenURI);

        return currentTokenId;
    }

    //ListNFT
    function listNFT(uint256 tokenId, uint256 price) public {}

    //BuyNFT

    //CancelNFT
}

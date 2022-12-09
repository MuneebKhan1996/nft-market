// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct NFTListing {
    uint256 price;
    address seller;
}

contract NFTMarket is ERC721URIStorage, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => NFTListing) private _listings;

    //if tokenURI is not and empty string then an NFT was created
    //if price is not zero then an NFT was listed
    //if price is 0 && tokenURI is an empty string then an NFT was transferred (either bought or the listing was cancelled)
    event NFTTransfer(
        uint256 tokenId,
        address from,
        address to,
        string tokenURI,
        uint256 price
    );

    constructor() ERC721("B NFTs", "BNFT") {}

    //create NFT
    function createNFT(string calldata tokenURI) public returns (uint256) {
        _tokenIds.increment();
        uint256 currentTokenId = _tokenIds.current();
        _safeMint(msg.sender, currentTokenId);
        _setTokenURI(currentTokenId, tokenURI);

        emit NFTTransfer(currentTokenId, address(0), msg.sender, tokenURI, 0);

        return currentTokenId;
    }

    //ListNFT
    function listNFT(uint256 tokenId, uint256 price) public {
        require(price > 0, "NFTMarket: price must be greater than zero");
        transferFrom(msg.sender, address(this), tokenId);
        _listings[tokenId] = NFTListing(price, msg.sender);

        emit NFTTransfer(tokenId, msg.sender, address(this), "", price);
    }

    //BuyNFT
    function buyNFT(uint256 tokenId) public payable {
        NFTListing memory listing = _listings[tokenId];
        require(listing.price > 0, "NFT not listed for sale");
        require(msg.value == listing.price, "NFT price incorrect");

        ERC721(address(this)).transferFrom(address(this), msg.sender, tokenId);
        clearListing(tokenId);
        payable(listing.seller).transfer(listing.price.mul(95).div(100));

        emit NFTTransfer(tokenId, address(this), msg.sender, "", 0);
    }

    //CancelNFT
    function cancelListing(uint256 tokenId) public {
        NFTListing memory listing = _listings[tokenId];
        require(listing.price > 0, "NFT not listed for sale");
        require(listing.seller == msg.sender, "NFT: You are not the seller :/");

        ERC721(address(this)).transferFrom(address(this), msg.sender, tokenId);

        clearListing(tokenId);

        emit NFTTransfer(tokenId, address(this), msg.sender, "", 0);
    }

    function withdrawFunds() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "NFT balance is zero");
        payable(owner()).transfer(balance);
    }

    function clearListing(uint256 tokenId) private {
        _listings[tokenId].price = 0;
        _listings[tokenId].seller = address(0);
    }
}

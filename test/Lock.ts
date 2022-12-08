import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('NFTMarket', () => {
  it('do something', async () => {
    const NFTMarket = await ethers.getContractFactory('NFTMarket');
    const nftMarket = await NFTMarket.deploy();
    await nftMarket.deployed();

    const tokenURI = 'https://www.token.uri';
    const transaction = await nftMarket.createNFT(tokenURI);
    const receipt = await transaction.wait();

    const tokenId = receipt.events[0].args.tokenId;
    const mintedTokenURI = await nftMarket.tokenURI(tokenId);
    expect(mintedTokenURI).to.equal(tokenURI);

    const ownerAddress = await nftMarket.ownerOf(tokenId);
    const signers = await ethers.getSigners();
    const currentAddress = await signers[0].getAddress();
    expect(ownerAddress).to.equal(currentAddress);
  });
});

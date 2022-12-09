import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('NFT market', () => {
  let nftMarket: Contract;
  let signers: SignerWithAddress[];

  const tokenURI = 'https://www.token.uri';

  before(async () => {
    const NFTMarket = await ethers.getContractFactory('NFTMarket');
    nftMarket = await NFTMarket.deploy();
    await nftMarket.deployed();
    signers = await ethers.getSigners();
  });

  const createNFT = async (tokenURI: string) => {
    const transaction = await nftMarket.createNFT(tokenURI);
    const receipt = await transaction.wait();
    const tokenId = receipt.events[0].args.tokenId;
    return tokenId;
  };

  const createAndListNFT = async (price: number) => {
    const tokenId = await createNFT(tokenURI);
    const transaction = await nftMarket.listNFT(tokenId, price);
    await transaction.wait();
    return tokenId;
  };

  describe('createNFT', () => {
    it('should create an NFT with the correct owner and tokenURI', async () => {
      const transaction = await nftMarket.createNFT(tokenURI);
      const receipt = await transaction.wait();
      const tokenId = receipt.events[0].args.tokenId;

      const mintedTokenURI = await nftMarket.tokenURI(tokenId);
      expect(mintedTokenURI).to.equal(tokenURI);

      const ownerAddress = await nftMarket.ownerOf(tokenId);
      const signers = await ethers.getSigners();
      const currentAddress = await signers[0].getAddress();
      expect(ownerAddress).to.equal(currentAddress);

      //nft transfer event has correct args

      const args = receipt.events[1].args;
      expect(args.tokenId).to.equal(tokenId);
      expect(args.from).to.equal(ethers.constants.AddressZero);
      expect(args.to).to.equal(ownerAddress);
      expect(args.tokenURI).to.equal(tokenURI);
      expect(args.price).to.equal(0);
    });
  });

  describe('ListNFT', () => {
    it('should revert if price is 0', async () => {
      const tokenId = await createNFT(tokenURI);

      const transaction = nftMarket.listNFT(tokenId, 0);
      await expect(transaction).to.be.revertedWith(
        'NFTMarket: price must be greater than zero'
      );
    });

    it('should revert if not called by the owner', async () => {
      const tokenId = await createNFT(tokenURI);
      const transaction = nftMarket.connect(signers[1]).listNFT(tokenId, 10);
      await expect(transaction).to.be.revertedWith(
        'ERC721: caller is not token owner or approved'
      );
    });

    it('should list token for sale if all requirements are met', async () => {
      const price = 12;

      const tokenId = await createNFT(tokenURI);
      const transaction = await nftMarket.listNFT(tokenId, price);
      const receipt = await transaction.wait();

      //Ownership should be transferred to the contract
      const ownerAddress = await nftMarket.ownerOf(tokenId);
      expect(ownerAddress).to.equal(nftMarket.address);

      const args = receipt.events[1].args;

      expect(args.tokenId).to.equal(tokenId);
      expect(args.from).to.equal(signers[0].address);
      expect(args.to).to.equal(nftMarket.address);
      expect(args.tokenURI).to.equal('');
      expect(args.price).to.equal(price);
    });
  });

  describe('BuyNFT', () => {
    it('should revert if NFT is not listed for sale', async () => {
      const transaction = nftMarket.buyNFT(999);
      await expect(transaction).to.be.revertedWith('NFT not listed for sale');
    });

    it('should revert if amount of wei sent is not equal to listed NFT price', async () => {
      const tokenId = createAndListNFT(908);
      const transaction = nftMarket.buyNFT(tokenId, { value: 22 });
      await expect(transaction).to.be.revertedWith('NFT price incorrect');
    });

    it('should transfer ownership to the buyer and send the price to the seller', async () => {
      const price = 123;
      const sellerProfit = Math.floor((price * 95) / 100);
      const fee = price - sellerProfit;

      const tokenId = await createAndListNFT(price);

      await new Promise((r) => setTimeout(r, 100));
      const oldSellerBalance = await signers[0].getBalance();

      const initialContractBalance = await nftMarket.provider.getBalance(
        nftMarket.address
      );

      const transaction = await nftMarket
        .connect(signers[1])
        .buyNFT(tokenId, { value: price });
      const receipt = await transaction.wait();

      await new Promise((r) => setTimeout(r, 100));
      const newSellerBalance = await signers[0].getBalance();

      const diff = newSellerBalance.sub(oldSellerBalance);
      expect(diff).to.equal(sellerProfit);
      expect(diff).to.equal(sellerProfit);

      const newContractBalance = await nftMarket.provider.getBalance(
        nftMarket.address
      );

      const contractBalanceDiff = newContractBalance.sub(
        initialContractBalance
      );

      expect(contractBalanceDiff).to.equal(fee);

      const ownerAddress = await nftMarket.ownerOf(tokenId);
      expect(ownerAddress).to.equal(signers[1].address);

      const args = receipt.events[1].args;

      expect(args.tokenId).to.equal(tokenId);
      expect(args.from).to.equal(nftMarket.address);
      expect(args.to).to.equal(signers[1].address);
      expect(args.tokenURI).to.equal('');
      expect(args.price).to.equal(0);
    });
  });

  describe('Cancel Listing', () => {
    it('should revert if NFT is not for sale', async () => {
      const transaction = nftMarket.cancelListing(9809809);
      await expect(transaction).to.be.revertedWith('NFT not listed for sale');
    });

    it('should revert if the caller is not the seller of the listing', async () => {
      const tokenId = await createAndListNFT(12312);
      const transaction = nftMarket.connect(signers[1]).cancelListing(tokenId);
      await expect(transaction).to.be.revertedWith(
        'NFT: You are not the seller :/'
      );
    });

    it('should transfer ownership back to the seller if all requirements are met', async () => {
      const tokenId = await createAndListNFT(12312);
      const transaction = await nftMarket.cancelListing(tokenId);
      const receipt = await transaction.wait();

      //check ownership
      const ownerAddress = await nftMarket.ownerOf(tokenId);
      expect(ownerAddress).to.equal(signers[0].address);

      console.log('receipt.events :', receipt.events.length);
      const args = receipt.events[1].args;
      expect(args.tokenId).to.equal(tokenId);
      expect(args.from).to.equal(nftMarket.address);
      expect(args.to).to.equal(signers[0].address);
      expect(args.tokenURI).to.equal('');
      expect(args.price).to.equal(0);
    });
  });

  describe('withdraw funds', () => {
    it('should revert if called by a signer other than the owner', async () => {
      const transaction = nftMarket.connect(signers[1]).withdrawFunds();
      await expect(transaction).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });

    it('should bla bla', async () => {
      const contractBalance = await nftMarket.provider.getBalance(
        nftMarket.address
      );

      const initialOwnerBalance = await signers[0].getBalance();
      const transaction = await nftMarket.withdrawFunds();
      const receipt = await transaction.wait();

      await new Promise((r) => setTimeout(r, 100));
      const newOwnerBalance = await signers[0].getBalance();

      const gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const transferred = newOwnerBalance.add(gas).sub(initialOwnerBalance);

      expect(transferred).to.equal(contractBalance);
      console.log('contractBalance :', contractBalance);
    });

    it('should revert if contract balance is zero', async () => {
      const transaction = nftMarket.withdrawFunds();
      await expect(transaction).to.be.revertedWith('NFT balance is zero');
    });
  });
});

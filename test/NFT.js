const {expect} = require('chai')

describe("NFT Contract", function() {

    let NFTContract;
    let NFT;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        NFTContract = await ethers.getContractFactory("NFT");
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        NFT = await NFTContract.deploy();
    });

    it("Should be able to deploy NFT Contract", async () => {
        expect(NFT.address).to.not.equal(0);
    });

    it("Should be able to mint NFT", async () => {
        await NFT.safeMint(addr1.address, 1);
        await NFT.safeMint(addr2.address, 2);

        expect(await NFT.ownerOf(1)).to.equal(addr1.address);
        expect(await NFT.ownerOf(2)).to.equal(addr2.address);
    });
});

describe("Fractional NFT Contract", function() {

    let NFTContract;
    let FNFTContract;
    let NFT;
    let FNFT;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    const totalSupply = 1000;
    const addressOne = '0x0000000000000000000000000000000000000001';

    beforeEach(async function () {
        NFTContract = await ethers.getContractFactory("NFT");
        FNFTContract = await ethers.getContractFactory("RFT");
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        NFT = await NFTContract.deploy();
        FNFT = await FNFTContract.deploy(totalSupply);
    });

    it("Should be able to deploy NFT Contract", async () => {
        expect(FNFT.address).to.not.equal(0);
    });

    it("TotalSupply of FNFT should be same with the given parameter", async () => {
        expect(await FNFT.totalSupply()).to.equal(totalSupply);
    });

    it("should support ERC-165 supportsInterface()", async () => {
        expect(await FNFT.supportsInterface('0x01ffc9a7')).to.be.true
    });

    it("Should be able to fractionalize NFT to FT", async () => {
        // NFT Information
        const tokenId = 10;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            await NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        expect(await NFT.ownerOf(tokenId)).to.equal(FNFT.address);
    });

    it("Should be able to point parent NFT", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            await NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        expect(await NFT.ownerOf(tokenId)).to.equal(FNFT.address);

        await FNFT.setParentNFT(NFT.address, tokenId);

        expect(await FNFT.parentToken()).to.equal(NFT.address);
    });

    it("Should be able to verify ownership of FNFT", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            await NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        expect(await NFT.ownerOf(tokenId)).to.equal(FNFT.address);

        await FNFT.setParentNFT(NFT.address, tokenId);

        const tAddr = FNFT.parentToken();
        const tId = await FNFT.parentTokenId();

        expect(
            await NFTContract.attach(tAddr).ownerOf(tId)
        ).to.equal(FNFT.address);
    });

    it("Should be able to transfer fraction of NFT", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            await NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        expect(await NFT.ownerOf(tokenId)).to.equal(FNFT.address);

        await FNFT.setParentNFT(NFT.address, tokenId);

        // Initial Balance of FT is designated by constructor
        expect(await FNFT.balanceOf(NFTOwner)).to.equal(1000);

        const transferAmount = 100;
        const recipient = addr1.address;

        expect(
            FNFT.transfer(recipient, transferAmount)
        ).to.emit(FNFT, "Transfer").withArgs(NFTOwner, recipient, transferAmount)

        expect(await FNFT.balanceOf(recipient)).to.be.equal(transferAmount)
    });

    it("Should revert when 3-party tries to transfer NFT", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.connect(addr1).transferFrom(NFTOwner, addr2.address, tokenId)
        ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved")

        expect(await NFT.ownerOf(tokenId)).to.not.equal(addr2.address);
    });

    it("Should revert when 3-party tries to transfer fraction of fractionalized NFT", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        await FNFT.setParentNFT(NFT.address, tokenId);

        await expect(
            FNFT.connect(addr1).transfer(addr2.address, 100)
        ).to.be.reverted

        expect(await FNFT.balanceOf(addr2.address)).to.not.equal(100);
    });

    it("Should be able to approve allowance", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        // Address to spend tokens on behalf
        const spender = addr2.address;
        const approvedAmount = 100;

        await expect(
            FNFT.approve(spender, 100)
        ).to.emit(FNFT, "Approval").withArgs(NFTOwner, spender, approvedAmount)

        expect(await FNFT.allowance(NFTOwner, spender)).to.equal(approvedAmount)
    });

    it("Should be able to transfer allowance if approved", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        // Address to spend tokens on behalf
        const spender = addr2;
        const approvedAmount = 100;

        await expect(
            FNFT.approve(spender.address, approvedAmount)
        ).to.emit(FNFT, "Approval").withArgs(NFTOwner, spender.address, approvedAmount)

        expect(await FNFT.allowance(NFTOwner, spender.address)).to.equal(approvedAmount)

        await expect(
            FNFT.connect(spender).transferFrom(NFTOwner, addr3.address, approvedAmount)
        ).to.emit(FNFT, "Transfer").withArgs(NFTOwner, addr3.address, approvedAmount)

        expect(await FNFT.balanceOf(addr3.address)).to.equal(approvedAmount)
    });

    it("Should revert if approver doesn't have enough balance", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        // Address to spend tokens on behalf
        const spender = addr2;
        const approvedAmount = 100;

        await expect(
            FNFT.approve(spender.address, approvedAmount)
        ).to.emit(FNFT, "Approval").withArgs(NFTOwner, spender.address, approvedAmount)

        expect(await FNFT.allowance(NFTOwner, spender.address)).to.equal(approvedAmount)

        await FNFT.transfer(addressOne, 1000)

        await expect(
            FNFT.connect(spender).transferFrom(NFTOwner, addr3.address, approvedAmount)
        ).to.be.reverted

        expect(await FNFT.balanceOf(addr3.address)).to.not.equal(approvedAmount)
    });

    it("Spender should not be able to spend more than approved", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        // Address to spend tokens on behalf
        const spender = addr2;
        const approvedAmount = 100;

        await expect(
            FNFT.approve(spender.address, approvedAmount)
        ).to.emit(FNFT, "Approval").withArgs(NFTOwner, spender.address, approvedAmount)

        expect(await FNFT.allowance(NFTOwner, spender.address)).to.equal(approvedAmount)

        await expect(
            FNFT.connect(spender).transferFrom(NFTOwner, addr3.address, approvedAmount)
        ).to.emit(FNFT, "Transfer").withArgs(NFTOwner, addr3.address, approvedAmount)

        expect(await FNFT.balanceOf(addr3.address)).to.equal(approvedAmount)

        await expect(
            FNFT.connect(spender).transferFrom(NFTOwner, addr3.address, approvedAmount)
        ).to.be.reverted
    });

    it("Should be able to increase allowance", async () => {
        // NFT Information
        const tokenId = 15;
        const NFTOwner = owner.address;

        await NFT.safeMint(NFTOwner, tokenId);
        expect(await NFT.ownerOf(tokenId)).to.equal(NFTOwner);

        await expect(
            NFT.transferFrom(NFTOwner, FNFT.address, tokenId)
        ).to.emit(NFT, "Transfer").withArgs(NFTOwner, FNFT.address, tokenId);

        // Address to spend tokens on behalf
        const spender = addr2;
        const approvedAmount = 100;
        await expect(
            FNFT.approve(spender.address, approvedAmount)
        ).to.emit(FNFT, "Approval").withArgs(NFTOwner, spender.address, approvedAmount)

        expect(await FNFT.allowance(NFTOwner, spender.address)).to.equal(approvedAmount)

        await expect(
            FNFT.connect(spender).transferFrom(NFTOwner, addr3.address, approvedAmount * 2)
        ).to.be.reverted

        await expect(
            FNFT.increaseAllowance(spender.address, approvedAmount)
        ).to.emit(FNFT, "Approval").withArgs(NFTOwner, spender.address, approvedAmount * 2)

        await expect(
            FNFT.connect(spender).transferFrom(NFTOwner, addr3.address, approvedAmount * 2)
        ).to.emit(FNFT, "Transfer").withArgs(NFTOwner, addr3.address, approvedAmount * 2)

        expect(await FNFT.balanceOf(addr3.address)).to.equal(approvedAmount * 2)
    });

});
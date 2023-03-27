const { ethers } = require('hardhat')
const { expect } = require('chai')

async function deploy() {
    const nftFactory = await ethers.getContractFactory('GroupNFT')
    
    const contract = await nftFactory.deploy()
    const owner = nftFactory.signer
    
    const tokenFactory = await ethers.getContractFactory('Dummy')
    const dummyToken1 =  await tokenFactory.deploy('Dummy 1', 'D1')
    const dummyToken2 =  await tokenFactory.deploy('Dummy 2', 'D2')
    const tokensOwner = tokenFactory.signer

    return { contract, owner, dummyToken1, dummyToken2, tokensOwner }
}

describe('GroupNFT should', function() {
    it('allow owner to add token', async function () {
        const { contract, owner, dummyToken1 } = await deploy()

        const tx = await contract.connect(owner).addToWhitelist(dummyToken1.address)
        const receipt = await tx.wait()
        const event = receipt.events[0]

        expect(event.args['token']).eq(dummyToken1.address)
        expect(await contract.requiredTokens(0)).eq(dummyToken1.address)
    })

    it('allow owner to remove token', async function () {
        const { contract, owner, dummyToken1, dummyToken2 } = await deploy()

        const tx = await contract.connect(owner).addToWhitelist(dummyToken1.address)
            .then(() => contract.connect(owner).addToWhitelist(dummyToken2.address))
            .then(() => contract.connect(owner).removeFromWhitelist(dummyToken1.address))

        const receipt = await tx.wait()
        const event = receipt.events[0]

        expect(event.args['token']).eq(dummyToken1.address)
        expect(await contract.requiredTokens(0)).eq(dummyToken2.address)
    })

    it('fail when non owner tries to add token', async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract, dummyToken1 } = await deploy()

       await expect(contract.connect(signer).addToWhitelist(dummyToken1.address)).revertedWith('Ownable: caller is not the owner')
    })

    it('fail when non owner tries to remove token', async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract, dummyToken1 } = await deploy()

        await expect(contract.connect(signer).removeFromWhitelist(dummyToken1.address)).revertedWith('Ownable: caller is not the owner')
    })

    it('fail when non owner tries to withdraw tokens', async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract } = await deploy()

        await expect(contract.connect(signer).withdraw()).revertedWith('Ownable: caller is not the owner')
    })

    it("fail to purchase when buyer doesn't have all tokens", async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract, owner, dummyToken1, dummyToken2, tokensOwner } = await deploy()

        const tx = contract.connect(owner).addToWhitelist(dummyToken1.address)
            .then(() => contract.connect(owner).addToWhitelist(dummyToken2.address))
            .then(() => dummyToken1.connect(tokensOwner).mint(signer.address, 10))
            .then(() => dummyToken1.connect(signer).increaseAllowance(contract.address, 1))
            .then(() => dummyToken2.connect(signer).increaseAllowance(contract.address, 1))
            .then(() => contract.connect(signer).buy())

        await expect(tx).revertedWith(`Missing token ${await dummyToken2.name()} to complete purchase`)
    })

    it("allow buyer to purchase when he has all the tokens", async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract, owner, dummyToken1, dummyToken2, tokensOwner } = await deploy()

        const tx = await contract.connect(owner).addToWhitelist(dummyToken1.address)
            .then(() => contract.connect(owner).addToWhitelist(dummyToken2.address))
            .then(() => dummyToken1.connect(tokensOwner).mint(signer.address, 10))
            .then(() => dummyToken2.connect(tokensOwner).mint(signer.address, 10))
            .then(() => dummyToken1.connect(signer).increaseAllowance(contract.address, 1))
            .then(() => dummyToken2.connect(signer).increaseAllowance(contract.address, 1))
            .then(() => contract.connect(signer).buy())

        const receipt = await tx.wait()
        const event = receipt.events.filter(event => event.event === 'Purchase')[0]

        expect(event.args['buyer']).eq(signer.address)
        expect(await contract.balanceOf(signer.address)).eq(ethers.BigNumber.from('1'))
        expect(await contract.ownerOf(ethers.BigNumber.from('0'))).eq(signer.address)
    })

    it("allow owner to withdraw all the tokens", async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract, owner, dummyToken1, dummyToken2, tokensOwner } = await deploy()

        const tx = await contract.connect(owner).addToWhitelist(dummyToken1.address)
            .then(() => contract.connect(owner).addToWhitelist(dummyToken2.address))
            .then(() => dummyToken1.connect(tokensOwner).mint(signer.address, 10))
            .then(() => dummyToken2.connect(tokensOwner).mint(signer.address, 10))
            .then(() => dummyToken1.connect(signer).increaseAllowance(contract.address, 1))
            .then(() => dummyToken2.connect(signer).increaseAllowance(contract.address, 1))
            .then(() => contract.connect(signer).buy())
            .then(() => contract.connect(owner).withdraw())

        const receipt = await tx.wait()
        const events = receipt.events

        expect(events.some(event => 
            event.event === 'Withdrawal' && 
            event.args['token'] === 'Dummy 1' && 
            ethers.BigNumber.from('1').eq( event.args['amount'])
        )).to.be.true
        expect(events.some(event => 
            event.event === 'Withdrawal' &&
            event.args['token'] === 'Dummy 2' &&
            ethers.BigNumber.from('1').eq( event.args['amount'])
        )).to.be.true
        expect(await dummyToken1.balanceOf(owner.address)).eq(1)
        expect(await dummyToken2.balanceOf(owner.address)).eq(1)
    })

    it("fail when owner registers non ERC20 address", async function () {
        const { contract, owner } = await deploy()

        const nftFactory = await ethers.getContractFactory('GroupNFT')
        const otherContract = await nftFactory.deploy()
        
        await expect(contract.connect(owner).addToWhitelist(otherContract.address)).revertedWith('Address is not ECR20')
    })
})
const { ethers } = require('hardhat')
const { expect } = require('chai')

async function deploy() {
    const contractFactory = await ethers.getContractFactory('SecretChangerToken')
    const contract = await contractFactory.deploy('secret x')
    const owner = contractFactory.signer
    return { contract, owner }
}

describe('SecretChanger should', function() {
    it('fail when a user tries to guess his own secret', async function () {
        const { contract, owner } = await deploy()
        expect(contract.connect(owner).mint('secret x', 'secret y')).revertedWith("You can't guess your own secret")
    })

    it('fail when secret guess is wrong', async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract } = await deploy()
        expect(contract.connect(signer).mint('secret y', 'secret z')).revertedWith('Incorrect secret!')
    })

    it('mint token when secret is correct', async function () {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract } = await deploy()


        const tx = await contract.connect(signer).mint('secret x', 'secret y')
        await tx.wait()
    
        expect(await contract.balanceOf(signer.address)).eq(ethers.BigNumber.from('1'))
        expect(await contract.ownerOf(ethers.BigNumber.from('0'))).eq(signer.address)
    })

    it('change secret and creator after mint', async function() {
        const signer = await ethers.getSigners().then(signers => signers[1])
        const { contract, owner } = await deploy()

        const tx = await contract.connect(signer).mint('secret x', 'secret y')
        await tx.wait()

        expect(contract.connect(owner).mint('secret y', 'secret z')).to.not.be.reverted
    })
})
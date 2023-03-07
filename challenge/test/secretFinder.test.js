const { ethers } = require('hardhat')
const { expect } = require('chai')

async function deploy() {
    const contractFactory = await ethers.getContractFactory('SecretFinder')
    const contract = await contractFactory.deploy('Luis', ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret x")))
    const owner = contractFactory.signer
    return { contract, owner }
}

describe('SecretChanger should', function() {
  it('mint token when secret is correct', async function () {
    const signer = await ethers.getSigners().then(signers => signers[1])
    const { contract } = await deploy()


    const tx = await contract.connect(signer).mint('secret x', ethers.utils.keccak256(ethers.utils.toUtf8Bytes('secret y')), 'Fernando')
    await tx.wait()

    expect(await contract.balanceOf(signer.address)).eq(ethers.BigNumber.from('5'))
  })

    it('fail when a user tries to guess his own secret', async function () {
      const { contract, owner } = await deploy()
      const newSecret = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret y"))
      expect(contract.connect(owner).mint('secret x', newSecret, 'Fernando')).revertedWith("You can't guess your own secret")
    })

    it('fail when secret guess is wrong', async function () {
      const signer = await ethers.getSigners().then(signers => signers[1])
      const { contract } = await deploy()
      expect(contract.connect(signer).mint('secret y', ethers.utils.keccak256(ethers.utils.toUtf8Bytes('secret z')))).revertedWith('Incorrect secret!')
    })

    it('change secret and keeper after mint', async function() {
      const signer = await ethers.getSigners().then(signers => signers[1])
      const { contract, owner } = await deploy()

      const tx = await contract.connect(signer).mint('secret x', ethers.utils.keccak256(ethers.utils.toUtf8Bytes('secret y')), 'Fernando')
      await tx.wait()

      expect(contract.connect(owner).mint('secret y', ethers.utils.keccak256(ethers.utils.toUtf8Bytes('secret z')))).to.not.be.reverted
    })

    it('let owner reset secret', async function () {
      const { contract, owner } = await deploy()
      const tx  = await contract.connect(owner).reset(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret 2")), 'Luis 2')

      await tx.wait()

      expect(tx).to.not.be.reverted
      expect(await contract.keeperName()).eq('Luis 2')
      expect(contract.connect(owner).mint('secret 1', ethers.utils.keccak256(ethers.utils.toUtf8Bytes('secret 3')))).to.be.reverted
    })

    it('fails when non owner tries to reset', async function () {
      const signer = await ethers.getSigners().then(signers => signers[1])
      const { contract } = await deploy()

      expect(contract.connect(signer).reset(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret 2")), 'Luis 2')).to.be.reverted
    })
})
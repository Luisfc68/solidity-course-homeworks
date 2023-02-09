const { ethers } = require('hardhat')
const { expect } = require('chai')

async function deploySafe() {
    const safeFactory = await ethers.getContractFactory('Safe')
    const safe = await safeFactory.deploy()
    const owner = safeFactory.signer
    return { safe, owner }
}

describe('Safe', function () {
    it('sets owner', async function () {
        const { safe, owner } = await deploySafe()
        expect(await safe.isOwner(owner.address)).to.be.true
    })

    it('receives deposits and emits event', async function () {
        const { safe, owner } = await deploySafe()

        const amount = ethers.utils.parseEther('0.1')

        const tx = await owner.sendTransaction({
            to: safe.address,
            value: amount
        })

        const receipt = await tx.wait()

        const event = receipt.logs[0]

        const decodedEvent = safe.interface.decodeEventLog('SafeDeposit', event.data, event.topics)

        expect(decodedEvent['timestamp']).lte(await ethers.provider.getBlock('latest').then(b => b.timestamp))
        expect(decodedEvent['amount']).eq(amount)
    })

    it('allows withdrawals', async function () {
        const { safe, owner } = await deploySafe()

        await owner.sendTransaction({
            to: safe.address,
            value: ethers.utils.parseEther('0.1')
        }).then(tx => tx.wait())

        const amount = ethers.utils.parseEther('0.03')
        const tx = await safe.connect(owner).withdraw(amount)
        const receipt = await tx.wait()
        const event = receipt.events[0]

        expect(event.args['timestamp']).lte(await ethers.provider.getBlock('latest').then(b => b.timestamp))
        expect(event.args['amount']).eq(amount)
        expect(await ethers.provider.getBalance(safe.address)).to.eq(ethers.utils.parseEther('0.07'))
    })

    it('doesn\'t allow others to withdraw', async function() {
        const { safe, owner } = await deploySafe()

        const receiver = await ethers.getSigners().then(signers => signers[1])

        await owner.sendTransaction({
            to: safe.address,
            value: ethers.utils.parseEther('0.1')
        }).then(tx => tx.wait())
        const amount = ethers.utils.parseEther('0.05')

        expect(safe.connect(receiver).withdraw(amount)).revertedWith('Only owner allowed')
        expect(await ethers.provider.getBalance(safe.address)).to.eq(ethers.utils.parseEther('0.1'))
    })
})
const { ethers } = require('hardhat')
const { expect } = require('chai')

async function deploySafe() {
    const safeFactory = await ethers.getContractFactory('FamilySafe')
    const members = await ethers.getSigners().then(s => s.slice(0, 3))
    const safe = await safeFactory.deploy(members.map(m => m.address))
    const owner = safeFactory.signer
    return { safe, owner, members }
}

describe('FamilySafe', function() {
    it('adds initial family members', async function () {
        const { safe, members } = await deploySafe()

        for (const member of members) {
            expect(await safe.familyMembers(member.address)).to.be.true
        }
    })

    it('receives deposits from family members and emits event', async function () {
        const { safe, owner } = await deploySafe()

        const sender = await ethers.getSigners().then(signers => signers[2])
        const amount = ethers.utils.parseEther('0.05')

        const tx = await sender.sendTransaction({
            to: safe.address,
            value: amount
        })

        const receipt = await tx.wait()

        const event = receipt.logs[0]

        const decodedEvent = safe.interface.decodeEventLog('FamilySafeDeposit', event.data, event.topics)

        expect(decodedEvent['user']).eq(sender.address)
        expect(decodedEvent['user']).not.eq(owner.address)
        expect(decodedEvent['timestamp']).lte(await ethers.provider.getBlock('latest').then(b => b.timestamp))
        expect(decodedEvent['amount']).eq(amount)
    })

    it('allows family members to withdraw', async function () {
        const { safe, members, owner } = await deploySafe()

        await owner.sendTransaction({
            to: safe.address,
            value: ethers.utils.parseEther('0.1')
        }).then(tx => tx.wait())

        const receiver = members[1]
        const amount = ethers.utils.parseEther('0.06')

        const tx = await safe.connect(receiver).withdraw(amount)
        const receipt = await tx.wait()
        const event = receipt.events[0]

        expect(event.args['user']).eq(receiver.address)
        expect(event.args['timestamp']).lte(await ethers.provider.getBlock('latest').then(b => b.timestamp))
        expect(event.args['amount']).eq(amount)
        expect(await ethers.provider.getBalance(safe.address)).to.eq(ethers.utils.parseEther('0.04'))
    })


    it('doesn\'t allow others to withdraw', async function() {
        const { safe, owner } = await deploySafe()

        await owner.sendTransaction({
            to: safe.address,
            value: ethers.utils.parseEther('0.1')
        }).then(tx => tx.wait())

        const receiver = await ethers.getSigners().then(signers => signers[4])
        const amount = ethers.utils.parseEther('0.05')

        expect(safe.connect(receiver).withdraw(amount)).revertedWith('Only owner or family allowed')
        expect(await ethers.provider.getBalance(safe.address)).to.eq(ethers.utils.parseEther('0.1'))
    })

    it('Adds new family member', async function() {
        const { safe, owner } = await deploySafe()

        const newMember = await ethers.getSigners().then(signers => signers[7])

        const tx = await safe.connect(owner).addFamilyMember(newMember.address)
        const receipt = await tx.wait()
        const event = receipt.events[0]

        expect(event.args['member']).eq(newMember.address)
        expect(await safe.familyMembers(newMember.address)).to.be.true
        expect(event.args['timestamp']).lte(await ethers.provider.getBlock('latest').then(b => b.timestamp))
    })

    it('Removes family member', async function() {
        const { safe, owner, members } = await deploySafe()
        
        const removed = members[1].address
        const tx = await safe.connect(owner).removeFamilyMember(removed)
        const receipt = await tx.wait()
        const event = receipt.events[0]

        expect(event.args['member']).eq(removed)
        expect(await safe.familyMembers(removed)).to.be.false
        expect(event.args['timestamp']).lte(await ethers.provider.getBlock('latest').then(b => b.timestamp))
    })

    it('Doesn\'t allow others to change family members', async function() {
        const { safe, members } = await deploySafe()

        const newMember = await ethers.getSigners().then(signers => signers[7])
        const notOwner = members[1]

        expect(safe.connect(notOwner).addFamilyMember(newMember)).revertedWith('Only owner allowed')
    })

    it('Doesn\'t consider owner a family member', async function() {
        const { safe, owner } = await deploySafe()

        expect(safe.connect(owner).addFamilyMember(owner)).revertedWith('Owner can\'t be considered family member')
    })
})
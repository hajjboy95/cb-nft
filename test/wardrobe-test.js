const chai = require('chai')
const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { solidity } = waffle

chai.use(solidity)

describe('Wardrobe', async () => {
    let creepbit
    let wardrobe
    let proxyAdmin
    let owner
    let user1
    let user2

    beforeEach( async () => {
        [owner, proxyAdmin, user1, user2] = await ethers.getSigners()

        const Creepbit = await ethers.getContractFactory('Creepbit')
        creepbit = await Creepbit.deploy(
            'cb',
            'cb',
            'test.com/',
            'test-unrevealed.com',
            [user1.address, user2.address],
            [60, 40]
        )

        await creepbit.deployed()
        creepbit.setWhitelistMerkleRoot('0x78ba61eadae58b0006723de8fcfbbb9d1c6d5919b8e4b23d1347923b58400bef')

        // deploy wardrobe
        const Wardrobe = await ethers.getContractFactory('Wardrobe')
        const w = await Wardrobe.connect(owner).deploy()
        await w.deployed()

        // deploy wardrobe whitelist
        const WardrobeProxy = await ethers.getContractFactory('WardrobeProxy')
        const wardrobeProxy = await WardrobeProxy.connect(owner).deploy(w.address, proxyAdmin.address, '0x')
        await wardrobeProxy.connect(owner).deployed()

        wardrobe = await ethers.getContractAt('IWardrobe', wardrobeProxy.address)
        await wardrobe.connect(owner).initialize(creepbit.address)

        const impl = await wardrobe.connect(owner).owner()
    })

    describe("wear", () => {
        let mockNft
        let wardrobeItem
        let nowTimestamp

        beforeEach(async () => {
            const MockNft = await ethers.getContractFactory('MockNft')
            mockNft = await MockNft.deploy()
            await mockNft.deployed()

            await mockNft.mint(user1.address, 2)

            await creepbit.setPause(false)
            await creepbit.setWhitelistMintingPeriod(false)
            await creepbit.connect(user1).mint(2, { value: ethers.utils.parseEther("0.04") })
            await creepbit.connect(user2).mint(2, { value: ethers.utils.parseEther("0.04") })

            await wardrobe.connect(owner).addWhitelistWearerAddress([mockNft.address])

            nowTimestamp = (await ethers.provider.getBlock('latest')).timestamp;

            wardrobeItem = {
                timeWorn: nowTimestamp,
                creepbitId: 0,
                wearerAddress: mockNft.address,
                wearerTokenId: 0,
                ownerAddress: user1.address
            }
        })

        it("Should store history when input it valid", async () => {
            await wardrobe.connect(user1).wear(wardrobeItem, { value: ethers.utils.parseEther("0.2") })
            const userWardrobeHistory = await wardrobe.connect(user1).getUserWardrobeHistory(user1.address)
            const creepbitWardrobeHistory = await wardrobe.connect(user1).getCreepbitWardrobeHistory(0)

            expect(userWardrobeHistory.length).to.equal(1)
            expect(userWardrobeHistory[0].timeWorn).to.equal(nowTimestamp)
            expect(userWardrobeHistory[0].creepbitId).to.equal(0)
            expect(userWardrobeHistory[0].wearerAddress).to.equal(mockNft.address)
            expect(userWardrobeHistory[0].wearerTokenId).to.equal(0)
            expect(userWardrobeHistory[0].ownerAddress).to.equal(user1.address)

            expect(creepbitWardrobeHistory.length).to.equal(1)
            expect(creepbitWardrobeHistory[0].timeWorn).to.equal(nowTimestamp)
            expect(creepbitWardrobeHistory[0].creepbitId).to.equal(0)
            expect(creepbitWardrobeHistory[0].wearerAddress).to.equal(mockNft.address)
            expect(creepbitWardrobeHistory[0].wearerTokenId).to.equal(0)
            expect(creepbitWardrobeHistory[0].ownerAddress).to.equal(user1.address)
        })

        it("Should fail adding history if amount sent is too little", async () => {
            await expect(wardrobe.connect(user1).wear(wardrobeItem, {  value: ethers.utils.parseEther("0.19") }))
                .to.be.revertedWith("Amount sent is too little")
        })

        it("Should fail adding history if timestamp is invalid", async () => {
            wardrobeItem.timeWorn = nowTimestamp - 3660
            await expect(wardrobe.connect(user1).wear(wardrobeItem, {  value: ethers.utils.parseEther("0.2") }))
                .to.be.revertedWith("Invalid timeWorn value")
        })

        it("Should fail adding history if creepbit doesn't exist", async () => {
            wardrobeItem.creepbitId = 101
            await expect(wardrobe.connect(user1).wear(wardrobeItem, { value: ethers.utils.parseEther("0.2") }))
                .to.be.revertedWith('OwnerQueryForNonexistentToken()')
        })

        it("Should fail adding history if user doesn't own the wearerNft", async () => {
            wardrobeItem.creepbitId = 2
            wardrobeItem.ownerAddress = user2.address

            await expect(wardrobe.connect(user2).wear(wardrobeItem, { value: ethers.utils.parseEther("0.2") }))
                .to.be.revertedWith("User doesn\'t own the wearer nft")
        })

        it("Should fail adding history if user doesn't own the creepbit", async () => {
            wardrobeItem.creepbitId = 2
            await expect(wardrobe.connect(user1).wear(wardrobeItem,  { value: ethers.utils.parseEther("0.2") }))
                .to.be.revertedWith("Sender doesn't own the creepbit")
        })

        it("Should fail adding history if wearerNft not whitelisted", async () => {
            await wardrobe.removeWhitelistWearerAddress([mockNft.address])
            await expect(wardrobe.connect(user1).wear(wardrobeItem,  { value: ethers.utils.parseEther("0.2") }))
                .to.be.revertedWith("Wearer contract must be whitelisted")
        })
    })

    describe('Proxy', async () => {
        let mockWardrobe

        beforeEach(async () => {
            const MockWardrobe = await ethers.getContractFactory('MockWardrobe')
            mockWardrobe = await MockWardrobe.deploy()
            await mockWardrobe.deployed()
        })

        it('Should revert if proxyAdmin calls logic method', async () => {
            await expect(wardrobe.connect(proxyAdmin).getCreepbitWardrobeHistory(0)).to.be.
                revertedWith('TransparentUpgradeableProxy: admin cannot fallback to proxy target')
        })
        
        it('Should emit upgraded when contract is upgraded', async () => {
            await expect(wardrobe.connect(proxyAdmin).upgradeTo(mockWardrobe.address)).to.emit(wardrobe, 'Upgraded');
        })
        
        it('Should call mockWardrobe contract after upgrade', async () => {
            await wardrobe.connect(proxyAdmin).upgradeTo(mockWardrobe.address)
            await expect(wardrobe.connect(user1).getUserWardrobeHistory(user1.address)).to.be.revertedWith('THIS IS A MOCK')
        })
    })
})


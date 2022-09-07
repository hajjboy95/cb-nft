const chai = require('chai')
const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { solidity } = waffle

chai.use(solidity)

describe('Creepbit', async () => {
  let creepbit
  let owner
  let user1
  let user2

  beforeEach( async () => {
    [owner, user1, user2] = await ethers.getSigners()

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
  })

  describe('Init state', async () => {
    it ('Should set the correct owner', async () => {
      expect(await creepbit.owner()).to.equal(owner.address);
    })

    it('Should have correct initial state', async () => {
      expect(await creepbit.maxSupply()).to.be.equal(10000)
      expect((await creepbit.cost()).toString()).to.be.equal(ethers.utils.parseEther("0.02"))
      // expect((await creepbit.wearCost()).toString()).to.be.equal(ethers.utils.parseEther("0.2"))
      expect(await creepbit.maxMintAmount()).to.be.equal(10)
      expect(await creepbit.paused()).to.be.equal(true)
      expect(await creepbit.revealed()).to.be.equal(false)
      expect(await creepbit.whitelistMintingPeriod()).to.be.equal(false)
    })
  })

  describe('Whitelist', async () => {
    it('Should whitelistMint when user is whitelisted', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(true)

      const proof = [
        '0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9',
        '0x1d2441b46c0a35b36ddae764677812405d1811ac1b6fb0b34aaef32ea07c6d88',
        '0xd18ac455643263f235bdcc7893ac970611f4e16eeb2d38cde066eef88bff646a'
      ]

      await creepbit.connect(user1).whitelistMint(2, proof, { value: ethers.utils.parseEther("0.04") })

      expect(await creepbit.balanceOf(user1.address)).to.equal(2)
    })

    it('Should revert whitelistMint when user is whitelisted but already claimed', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(true)

      const proof = [
        '0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9',
        '0x1d2441b46c0a35b36ddae764677812405d1811ac1b6fb0b34aaef32ea07c6d88',
        '0xd18ac455643263f235bdcc7893ac970611f4e16eeb2d38cde066eef88bff646a'
      ]

      await creepbit.connect(user1).whitelistMint(2, proof, { value: ethers.utils.parseEther("0.04") })

      expect(await creepbit.balanceOf(user1.address)).to.equal(2)

      await expect(creepbit.connect(user1).whitelistMint(2, proof,
        { value: ethers.utils.parseEther("0.04") }))
        .to.be.revertedWith('Already claimed your whitelist slot')

      expect(await creepbit.balanceOf(user1.address)).to.equal(2)
    })
  })

  describe("Mint", async () => {
    it('Should mint when not paused and not whitelist period', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)
      await creepbit.mint(2)
      const tokenBalance = await creepbit.walletOfOwner(owner.address)
      expect(tokenBalance.length === 2)

      expect(await creepbit.balanceOf(owner.address)).to.equal(2)
    })

    it('Should mint and have unrevealed URI when revealed state is false', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)
      await creepbit.mint(2)

      const ownersWallet = await creepbit.walletOfOwner(owner.address)
      const tokenUriOne = await creepbit.tokenURI(ownersWallet[0])
      const tokenUriTwo = await creepbit.tokenURI(ownersWallet[1])

      expect(tokenUriOne).to.equal('test-unrevealed.com')
      expect(tokenUriTwo).to.equal('test-unrevealed.com')
    })

    it('Should mint and have revealed URI when revealed state is true', async () => {
      await creepbit.setPause(false)
      await creepbit.setReveal(true)
      await creepbit.setWhitelistMintingPeriod(false)
      await creepbit.mint(2)

      const ownersWallet = await creepbit.walletOfOwner(owner.address)
      const tokenUriOne = await creepbit.tokenURI(ownersWallet[0])
      const tokenUriTwo = await creepbit.tokenURI(ownersWallet[1])

      expect(tokenUriOne).to.equal('test.com/0')
      expect(tokenUriTwo).to.equal('test.com/1')
    })

    it('Should revert mint when above maxAmount', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)
      await expect(creepbit.mint(11)).to.be.revertedWith("Above max mint threshold")
    })

    it('Should revert mint when paused', async () => {
      await creepbit.setPause(true)
      await creepbit.setWhitelistMintingPeriod(false)
      await expect(creepbit.mint(2)).to.be.revertedWith("Currently paused")
    })

    it('Should revert mint when not whitelist period', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(true)

      await expect(creepbit.connect(user2).mint(2,
        { value: ethers.utils.parseEther("0.04") })).
      to.be.revertedWith('Whitelist minting period is currently on')

    })

    it('Should revert mint if mint cost is too low for amount', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)

      await expect(creepbit.connect(user1).mint(2,
        { value: ethers.utils.parseEther("0.03") })).to.be.revertedWith("Mint cost too low")
    })
  })

  describe("walletOfOwner", () => {
    it("Should return the indexes of the nfts, when successfully minted", async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)
      await creepbit.connect(user1).mint(2, { value: ethers.utils.parseEther("0.04") })
      const indexBalances = await creepbit.walletOfOwner(user1.address)

      await expect(indexBalances.length).to.be.equal(2)
      await expect(indexBalances[0]).to.be.equal(0)
      await expect(indexBalances[1]).to.be.equal(1)
    })
  })

  describe("PaymentSplitter", () => {

   beforeEach(async () => {
     await creepbit.setPause(false)
     await creepbit.setWhitelistMintingPeriod(false)

     await creepbit.connect(user1).mint(8, { value: ethers.utils.parseEther("0.16") })
     await creepbit.connect(user2).mint(2, { value: ethers.utils.parseEther("0.04") })
   })

    it("Should have totalShares to equal 100", async () => {
      const totalShares = await creepbit.totalShares()
      console.log('totalShares', totalShares)
      expect(totalShares.toNumber()).to.equal(100)
    })

    it("Should have the correct share split", async () => {
      const user1Shares = await creepbit.shares(user1.address)
      const user2Shares = await creepbit.shares(user2.address)

      expect(user1Shares.toNumber()).to.equal(60)
      expect(user2Shares.toNumber()).to.equal(40)
    })

    // it("Should release the correct amount for the user", async () => {
    //   const a = await creepbit.release(user1.address)
    //   console.log('a', a)
    // })
  })

  // describe("wear", () => {
  //   let mockNft
  //   let wardrobeItem
  //   let nowTimestamp
  //
  //   beforeEach(async () => {
  //     const MockNft = await ethers.getContractFactory('MockNft')
  //     mockNft = await MockNft.deploy()
  //     await mockNft.deployed()
  //
  //     await mockNft.mint(user1.address, 2)
  //
  //     await creepbit.setPause(false)
  //     await creepbit.setWhitelistMintingPeriod(false)
  //     await creepbit.connect(user1).mint(2, { value: ethers.utils.parseEther("0.04") })
  //     await creepbit.connect(user2).mint(2, { value: ethers.utils.parseEther("0.04") })
  //     await creepbit.addWhitelistWearerAddress([mockNft.address])
  //
  //     nowTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
  //
  //     wardrobeItem = {
  //       timeWorn: nowTimestamp,
  //       creepbitId: 0,
  //       wearerAddress: mockNft.address,
  //       wearerTokenId: 0,
  //       ownerAddress: user1.address
  //     }
  //   })
  //
  //   it("Should store history when input it valid", async () => {
  //     await creepbit.connect(user1).wear(wardrobeItem, { value: ethers.utils.parseEther("0.2") })
  //     const userWardrobeHistory = await creepbit.getUserWardrobeHistory(user1.address)
  //     const creepitWardrobeHistory = await creepbit.getCreepbitWardrobeHistory(0)
  //
  //     expect(userWardrobeHistory.length).to.equal(1)
  //     expect(userWardrobeHistory[0].timeWorn).to.equal(nowTimestamp)
  //     expect(userWardrobeHistory[0].creepbitId).to.equal(0)
  //     expect(userWardrobeHistory[0].wearerAddress).to.equal(mockNft.address)
  //     expect(userWardrobeHistory[0].wearerTokenId).to.equal(0)
  //     expect(userWardrobeHistory[0].ownerAddress).to.equal(user1.address)
  //
  //     expect(creepitWardrobeHistory.length).to.equal(1)
  //     expect(creepitWardrobeHistory[0].timeWorn).to.equal(nowTimestamp)
  //     expect(creepitWardrobeHistory[0].creepbitId).to.equal(0)
  //     expect(creepitWardrobeHistory[0].wearerAddress).to.equal(mockNft.address)
  //     expect(creepitWardrobeHistory[0].wearerTokenId).to.equal(0)
  //     expect(creepitWardrobeHistory[0].ownerAddress).to.equal(user1.address)
  //   })
  //
  //   it("Should fail adding history if amount sent is too little", async () => {
  //     await expect(creepbit.connect(user1).wear(wardrobeItem, {  value: ethers.utils.parseEther("0.19") }))
  //       .to.be.revertedWith("Amount sent is too little")
  //   })
  //
  //   it("Should fail adding history if timestamp is invalid", async () => {
  //     wardrobeItem.timeWorn = nowTimestamp - 3660
  //     await expect(creepbit.connect(user1).wear(wardrobeItem, {  value: ethers.utils.parseEther("0.2") }))
  //       .to.be.revertedWith("Invalid timeWorn value")
  //   })
  //
  //   it("Should fail adding history if creepbit doesn't exist", async () => {
  //     wardrobeItem.creepbitId = 101
  //     await expect(creepbit.connect(user1).wear(wardrobeItem, { value: ethers.utils.parseEther("0.2") }))
  //       .to.be.revertedWith('OwnerQueryForNonexistentToken()')
  //   })
  //
  //   it("Should fail adding history if user doesn't own the wearerNft", async () => {
  //     wardrobeItem.creepbitId = 2
  //     wardrobeItem.ownerAddress = user2.address
  //
  //     await expect(creepbit.connect(user2).wear(wardrobeItem, { value: ethers.utils.parseEther("0.2") }))
  //       .to.be.revertedWith("User doesn\'t own the wearer nft")
  //   })
  //
  //   it("Should fail adding history if user doesn't own the creepbit", async () => {
  //     wardrobeItem.creepbitId = 2
  //     await expect(creepbit.connect(user1).wear(wardrobeItem,  { value: ethers.utils.parseEther("0.2") }))
  //       .to.be.revertedWith("Sender doesn't own the creepbit")
  //   })
  //
  //   it("Should fail adding history if wearerNft not whitelisted", async () => {
  //     await creepbit.removeWhitelistWearerAddress([mockNft.address])
  //     await expect(creepbit.connect(user1).wear(wardrobeItem,  { value: ethers.utils.parseEther("0.2") }))
  //       .to.be.revertedWith("Wearer contract must be whitelisted")
  //   })
  // })

  describe("Prod states", () => {
    it("whitelisting", async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(true)

      expect(await creepbit.paused()).to.equal(false)
      expect(await creepbit.whitelistMintingPeriod()).to.equal(true)
      expect(await creepbit.revealed()).to.equal(false)
    })

    it('public mint', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)

      expect(await creepbit.paused()).to.equal(false)
      expect(await creepbit.whitelistMintingPeriod()).to.equal(false)
      expect(await creepbit.revealed()).to.equal(false)
    })

    it('revealed state', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)
      await creepbit.setReveal(true)

      expect(await creepbit.paused()).to.equal(false)
      expect(await creepbit.whitelistMintingPeriod()).to.equal(false)
      expect(await creepbit.revealed()).to.equal(true)
    })
  })
})

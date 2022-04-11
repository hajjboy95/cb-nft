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
      'test-unrevealed.com'
    )

    await creepbit.deployed()
    creepbit.setWhitelistMerkleRoot('0x78ba61eadae58b0006723de8fcfbbb9d1c6d5919b8e4b23d1347923b58400bef')
  })

  describe('Init state', async () => {
    it ('Should set the correct owner', async () => {
      expect(await creepbit.owner()).to.equal(owner.address);
    })

    it('Should have correct initial state', async () => {
      expect(await creepbit.maxSupply()).to.be.equal(20)
      expect((await creepbit.cost()).toString()).to.be.equal('20000000000000000')
      expect(await creepbit.maxMintAmount()).to.be.equal(2)
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

      expect(tokenUriOne).to.equal('test.com/1')
      expect(tokenUriTwo).to.equal('test.com/2')
    })

    it('Should revert mint when above maxAmount', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(false)
      await expect(creepbit.mint(4)).to.be.revertedWith("Above max mint threshold")
    })

    it('Should revert mint when paused', async () => {
      await creepbit.setPause(true)
      await creepbit.setWhitelistMintingPeriod(false)
      await expect(creepbit.mint(2)).to.be.revertedWith("Currently paused")
    })

    it('Should revert mint when not whitelist period', async () => {
      await creepbit.setPause(false)
      await creepbit.setWhitelistMintingPeriod(true)

      await expect(creepbit.mint(2)).to.be.revertedWith("Whitelist minting period is currently on")
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
      await expect(indexBalances[0]).to.be.equal(1)
      await expect(indexBalances[1]).to.be.equal(2)
    })
  })

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

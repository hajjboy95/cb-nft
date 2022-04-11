const hre = require('hardhat')
const args = require('../arguments')

async function main () {
    const Creepbit = await hre.ethers.getContractFactory('Creepbit')
    const creepbit = await Creepbit.deploy(
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5]
    )
    await creepbit.deployed()
    console.log('creepbit deployed to:', creepbit.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

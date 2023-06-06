require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-etherscan')
require('dotenv').config()

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

const apiKey = process.env.NODE_API_KEY
const privKey = process.env.ACCOUNT_PRIV
const etherscanApiKey = process.env.ETHERSCAN_API_KEY

module.exports = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0 // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
    },
    localhost: {
      url: 'http://localhost:8545',
      accounts: [privKey]
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${apiKey}`,
      accounts: [privKey],
      gasLimit: 800000,
      gasPrice: 10000000000
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${apiKey}`,
      accounts: [privKey],
      gasLimit: 800000,
      gasPrice: 10000000000
    }
  },
  etherscan: {
    apiKey: etherscanApiKey
  }
}

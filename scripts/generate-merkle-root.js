const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

let whitelistAddresses = [
  '0xb2Eb923f1a799b6CBAde5df8529613ddAB035Cc5',
  '0x99339fAEFCBeAc7Ed647F40876bbee495dD13258',
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x134A7684027462b7d251944d14D561238E008e04'
].map(e => e.toLowerCase())


let hashedWhitelist = whitelistAddresses.map(keccak256).map(e => e.toString('hex'))


const merkleTree = new MerkleTree(hashedWhitelist, keccak256, { sortPairs: true })

function getMerkleProof(merkleTree, leafNode) {
  const rootHash = merkleTree.getRoot()
  const proof = merkleTree.getHexProof(leafNode)

  console.log('rootHash', rootHash.toString('hex'))
  console.log('whitelist merkle tree', merkleTree.toString())

  return proof
}


// this willl be sent with the tx
const proofForIndex = 5
console.log(`proof for ${whitelistAddresses[proofForIndex]} = `, getMerkleProof(merkleTree, hashedWhitelist[proofForIndex]))

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleWhitelist is Ownable {
    bytes32 public whitelistMerkleRoot;

    function verifySender(bytes32[] memory proof, address callerAddress) public view returns (bool) {
        return _verify(proof, _hash(callerAddress));
    }

    function _verify(bytes32[] memory proof, bytes32 addressHash)
    internal
    view
    returns (bool)
    {
        return MerkleProof.verify(proof, whitelistMerkleRoot, addressHash);
    }

    function _hash(address _address) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    function setWhitelistMerkleRoot(bytes32 merkleRoot) external onlyOwner {
        whitelistMerkleRoot = merkleRoot;
    }
}

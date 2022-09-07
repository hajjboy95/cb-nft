// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "erc721a/contracts/ERC721A.sol";

contract Wardrobe is Initializable, OwnableUpgradeable {

    struct WardrobeItem {
        uint256 timeWorn;
        uint256 creepbitId;
        // NFT address of the collection that's being worn with the watch
        address wearerAddress;
        uint256 wearerTokenId;
        address ownerAddress;
    }

    IERC721 public creepbit;

    uint256 public wearCost;
    mapping(address => WardrobeItem[]) private userWardrobeHistory;
    mapping(uint256 => WardrobeItem[]) private creepbitWardrobeHistory;
    mapping(address => bool) private whitelistedContracts;

    // External functions

    /// @notice initializer for the upgradeable contract
    /// @param creepbitAddress address of the pollen token contract
    function initialize(address creepbitAddress)
    external
    initializer
    {
        creepbit = ERC721A(creepbitAddress);
        wearCost = 0.2 ether;
        __Ownable_init();
    }


    function wear(WardrobeItem calldata wardrobeHistory) external payable {

    }

    function addWhitelistWearerAddress(address[] calldata contracts) external onlyOwner {
        for (uint256 i = 0; i < contracts.length; i++) {
            whitelistedContracts[contracts[i]] = true;
        }
    }

    function removeWhitelistWearerAddress(address[] calldata contracts) external onlyOwner {
        for (uint256 i = 0; i < contracts.length; i++) {
            delete whitelistedContracts[contracts[i]];
        }
    }

    function setWearCost(uint256 _newCost) external onlyOwner {
        wearCost = _newCost;
    }

    function getUserWardrobeHistory(address user) external view returns (WardrobeItem[] memory) {
        return userWardrobeHistory[user];
    }

    function getCreepbitWardrobeHistory(uint256 tokenId) external view returns (WardrobeItem[] memory) {
        return creepbitWardrobeHistory[tokenId];
    }
}
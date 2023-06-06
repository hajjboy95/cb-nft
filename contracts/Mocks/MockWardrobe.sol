// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "erc721a/contracts/ERC721A.sol";

contract MockWardrobe is Initializable, OwnableUpgradeable {

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
        require(false, 'THIS IS A MOCK');
    }

    function addWhitelistWearerAddress(address[] calldata contracts) external onlyOwner {
        require(false, 'THIS IS A MOCK');
    }

    function removeWhitelistWearerAddress(address[] calldata contracts) external onlyOwner {
        require(false, 'THIS IS A MOCK');
    }

    function setWearCost(uint256 _newCost) external onlyOwner {
        require(false, 'THIS IS A MOCK');
    }

    function getUserWardrobeHistory(address user) external view returns (WardrobeItem[] memory) {
        require(false, 'THIS IS A MOCK');
    }

    function getCreepbitWardrobeHistory(uint256 tokenId) external view returns (WardrobeItem[] memory) {
        require(false, 'THIS IS A MOCK');
    }
}

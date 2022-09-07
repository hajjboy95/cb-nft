/// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8;

/// @title IWardrobe
/// @notice Wardrobe interface

 struct WardrobeItem {
    uint256 timeWorn;
    uint256 creepbitId;
    address wearerAddress;
    uint256 wearerTokenId;
    address ownerAddress;
 }
 
interface IWardrobe {
  event Initialized ( uint8 version );
  event OwnershipTransferred ( address previousOwner, address newOwner );
  function addWhitelistWearerAddress ( address[] calldata contracts ) external;
  function creepbit (  ) external view returns ( address );
  function getCreepbitWardrobeHistory ( uint256 tokenId ) external view returns ( WardrobeItem[] memory );
  function getUserWardrobeHistory ( address user ) external view returns ( WardrobeItem[] memory );
  function initialize ( address creepbitAddress ) external;
  function owner (  ) external view returns ( address );
  function removeWhitelistWearerAddress ( address[] calldata contracts ) external;
  function renounceOwnership (  ) external;
  function setWearCost ( uint256 _newCost ) external;
  function transferOwnership ( address newOwner ) external;
  function wear ( WardrobeItem calldata wardrobeHistory ) external payable;
  function wearCost (  ) external view returns ( uint256 );
  event AdminChanged ( address previousAdmin, address newAdmin );
  event BeaconUpgraded ( address beacon );
  event Upgraded ( address implementation );
  function admin (  ) external returns ( address admin_ );
  function changeAdmin ( address newAdmin ) external;
  function implementation (  ) external returns ( address implementation_ );
  function upgradeTo ( address newImplementation ) external;
  function upgradeToAndCall ( address newImplementation, bytes calldata data ) external payable;
}

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "./MerkleWhitelist.sol";

contract Creepbit is ERC721A, Ownable, MerkleWhitelist, PaymentSplitter {
    using Strings for uint256;
    string baseURI;

    uint256 public cost = 0.02 ether;
    uint256 public maxSupply = 10000;
    uint256 public maxMintAmount = 10;

    bool public paused = true;
    bool public revealed = false;
    bool public whitelistMintingPeriod = false;
    string public notRevealedUri;

    mapping(address => bool) private claimedWhitelist;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI, // metadata cid
        string memory _initNotRevealedUri, // metadata cid
        address[] memory _payees,
        uint256[] memory _shares
    ) ERC721A(_name, _symbol) PaymentSplitter(_payees, _shares) payable {
        setBaseURI(_initBaseURI);
        setNotRevealedURI(_initNotRevealedUri);
    }

    // External functions

    function setReveal(bool _state) external onlyOwner {
        revealed = _state;
    }

    function setCost(uint256 _newCost) external onlyOwner {
        cost = _newCost;
    }

    function setMaxMintAmount(uint256 _newMaxMintAmount) external onlyOwner {
        maxMintAmount = _newMaxMintAmount;
    }

    function setPause(bool _state) external onlyOwner {
        paused = _state;
    }

    function setWhitelistMintingPeriod(bool _state) external onlyOwner {
        whitelistMintingPeriod = _state;
    }

    function mint(uint256 _mintAmount) external payable {
        require(!whitelistMintingPeriod, "Whitelist minting period is currently on");

        uint256 supply = totalSupply();

        _mintGeneralChecks(_mintAmount, supply);
        _safeMint(msg.sender, _mintAmount);
    }

    function whitelistMint(uint256 _mintAmount, bytes32[] calldata proof) external payable  {
        require(whitelistMintingPeriod, "Whitelist period complete");

        uint256 supply = totalSupply();
        _mintGeneralChecks(_mintAmount, supply);

        require(!claimedWhitelist[msg.sender], "Already claimed your whitelist slot");
        require(verifySender(proof, msg.sender), "Not whitelisted");

        claimedWhitelist[msg.sender] = true;

        _safeMint(msg.sender, _mintAmount);
    }

    // External functions that are view

    function walletOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
        uint256 currentTokenId = _startTokenId();
        uint256 ownedTokenIndex = 0;
        address latestOwnerAddress;

        while (ownedTokenIndex < ownerTokenCount && currentTokenId <= maxSupply) {
            TokenOwnership memory ownership = _ownerships[currentTokenId];

            if (!ownership.burned && ownership.addr != address(0)) {
                latestOwnerAddress = ownership.addr;
            }

            if (latestOwnerAddress == _owner) {
                ownedTokenIds[ownedTokenIndex] = currentTokenId;

                ownedTokenIndex++;
            }

            currentTokenId++;
        }

        return ownedTokenIds;
    }

    function getMerkleRootHash() external view onlyOwner returns (bytes32) {
        return whitelistMerkleRoot;
    }

    // Public functions

    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    // Public functions that are view

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory){
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        if(revealed == false) {
            return notRevealedUri;
        }

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, tokenId.toString()))
        : "";
    }

    // Internal functions

    // Internal functions that are view

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    // Private functions

    function _mintGeneralChecks(uint256 _mintAmount, uint256 _supply) private {
        require(!paused, "Currently paused");
        require(_mintAmount > 0, "Mint amount must be greater than 1");
        require(_mintAmount <= maxMintAmount, "Above max mint threshold");


        require(_supply + _mintAmount <= maxSupply);

        if (msg.sender != owner()) {
            require(msg.value >= cost * _mintAmount, "Mint cost too low");
        }
    }
}

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

    struct WardrobeHistory {
        uint256 timeWarn;

        uint256 creepbitId;

        // NFT address of the collection that's being warn with the watch
        address wearerAddress;
        uint256 wearerTokenId;

        address ownerAddress;
    }

    string baseURI;

    uint256 public cost = 0.02 ether;
    uint256 public maxSupply = 20;
    uint256 public maxMintAmount = 2;

    bool public paused = true;
    bool public revealed = false;
    bool public whitelistMintingPeriod = false;
    string public notRevealedUri;

    mapping(address => bool) public claimedWhitelist;

    mapping(address => WardrobeHistory[]) public userWardrobeHistory;
    mapping(uint256 => WardrobeHistory[]) public tokenWardrobeHistory;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI,
        string memory _initNotRevealedUri,
        address[] memory _payees,
        uint256[] memory _shares
    ) ERC721A(_name, _symbol) PaymentSplitter(_payees, _shares) payable {
        setBaseURI(_initBaseURI);
        setNotRevealedURI(_initNotRevealedUri);
    }

    function wear(WardrobeHistory memory wardrobeHistory) {
        require(msg.sender == wardrobeHistory.ownerAddress, "Owner address doesn\'t match");

        address ownerOfCreepbit = ownerOf(wardrobeHistory.creepbitId);

        require(ownerOfCreepbit == msg.sender, "Sender doesn't own the creepbit");

        require(found, "User doesn\'t own the nft");
        require(block.timestamp - 3600 > wardrobeHistory.timeWarn, "Invalid timewarn value");

        IERC721 nft = IERC721(wardrobeHistory.wearerAddress);
        // TODO: check if this is safe
        address wearerNftOwner = nft.ownerOf(wardrobeHistory.wearerTokenId);

        require(wearerNftOwner == msg.sender, "User doesn\'t own the wearer nft");

        userWardrobeHistory[msg.sender].push(wardrobeHistory);
        tokenWardrobeHistory[wardrobeHistory.creepbitId].push(wardrobeHistory);
    }

    // internal
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function _mintGeneralChecks(uint256 _mintAmount, uint256 _supply) private {
        require(!paused, "Currently paused");
        require(_mintAmount > 0, "Mint amount must be greater than 1");
        require(_mintAmount <= maxMintAmount, "Above max mint threshold");


        require(_supply + _mintAmount <= maxSupply);

        if (msg.sender != owner()) {
            require(msg.value >= cost * _mintAmount, "Mint cost too low");
        }
    }

    // public
    function mint(uint256 _mintAmount) public payable {
        require(!whitelistMintingPeriod, "Whitelist minting period is currently on");

        uint256 supply = totalSupply();

        _mintGeneralChecks(_mintAmount, supply);
        _safeMint(msg.sender, _mintAmount);
    }

    function whitelistMint(uint256 _mintAmount, bytes32[] memory proof) public payable  {
        require(whitelistMintingPeriod, "Whitelist period complete");

        uint256 supply = totalSupply();
        _mintGeneralChecks(_mintAmount, supply);

        require(!claimedWhitelist[msg.sender], "Already claimed your whitelist slot");
        require(verifySender(proof, msg.sender), "Not whitelisted");

        claimedWhitelist[msg.sender] = true;

        _safeMint(msg.sender, _mintAmount);
    }

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

    function tokenURI(uint256 tokenId)
    public
    view
    virtual
    override
    returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        if(revealed == false) {
            return notRevealedUri;
        }

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, tokenId.toString()))
        : "";
    }

    function getMerkleRootHash() public view onlyOwner returns (bytes32) {
       return whitelistMerkleRoot;
    }

    function setReveal(bool _state) public onlyOwner {
        revealed = _state;
    }

    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }

    function setMaxMintAmount(uint256 _newMaxMintAmount) public onlyOwner {
        maxMintAmount = _newMaxMintAmount;
    }

    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setPause(bool _state) public onlyOwner {
        paused = _state;
    }

    function setWhitelistMintingPeriod(bool _state) public onlyOwner {
        whitelistMintingPeriod = _state;
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 0;
    }
}

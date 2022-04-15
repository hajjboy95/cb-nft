// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "erc721a/contracts/ERC721A.sol";

contract MockNft is ERC721A {
    constructor() ERC721A("Mock NFT", "Mock") {}

    function mint(address to, uint256 amount) external {
        _safeMint(to, amount);
    }
}

//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.17;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/utils/Counters.sol";

// every person has to guess the secret of previous minter and set the next secret
contract SecretChangerToken is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    string private secret;
    address private secretCreator;

    constructor(string memory _secret) ERC721('Secret Chager NFT', 'SCT') {
        secret = _secret;
        secretCreator = msg.sender;
    }

    function mint(string memory guess, string memory newSecret) public returns (bool) {
        require(secretCreator != msg.sender, "You can't guess your own secret");
        require(keccak256(abi.encodePacked(secret)) == keccak256(abi.encodePacked(guess)), 'Incorrect secret!');
        secret = newSecret;
        secretCreator = msg.sender;
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _mint(msg.sender, tokenId);
    }
}
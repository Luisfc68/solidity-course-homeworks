//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0 ;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// You need to ask the secret to the keeper or guess it by yourself!
contract SecretFinder is ERC20, Ownable {
    string public keeperName;
    address public keeperAddress;
    bytes32 private secret;

    constructor(string memory _keeperName, bytes32 _secret) ERC20('Secret Finder Token', 'SFT') {
        keeperName = _keeperName;
        secret = _secret;
        keeperAddress = owner();
        _mint(owner(), 5);
    }

    function mint(string memory guess, bytes32 newSecret, string memory newKeeperName) public {
        require(keeperAddress != msg.sender, "You can't guess your own secret");
        require(keccak256(abi.encodePacked(guess)) == secret, 'Incorrect secret!');

        secret = newSecret;
        keeperName = newKeeperName;
        keeperAddress = msg.sender;

        _mint(msg.sender, 5);
    }

    function reset(bytes32 newSecret, string memory newKeeperName) onlyOwner public {
        secret = newSecret;
        keeperName = newKeeperName;
        keeperAddress = owner();
    }
}

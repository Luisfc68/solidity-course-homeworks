//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GroupNFT is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    ERC20[] public requiredTokens;

    event NewRequiredToken(ERC20 token, uint256 currentSupply);
    event RequiredTokenRemoved(ERC20 token);
    event Purchase(address buyer);
    event Withdrawal(string token, uint256 amount);

    constructor() ERC721("GroupNFT", "GNFT") {}

    function addToWhitelist(ERC20 token) external onlyOwner {
        require(getTokenIndex(token) == -1, "Token already registered");
        requiredTokens.push(token);
        try token.totalSupply() returns(uint256 currentSupply) {
            emit NewRequiredToken(token, currentSupply);
        } catch {
            revert("Address is not ECR20");
        }
    }

    function getTokenIndex(ERC20 token) private view returns(int256) {
        for (uint i = 0; i < requiredTokens.length; i++) {
            if (requiredTokens[i] == token) {
                return int256(i);
            }
        }
        return -1;
    }

    function removeFromWhitelist(ERC20 token) external onlyOwner {
        int256 index = getTokenIndex(token);
        if (index != -1) {
            requiredTokens[uint256(index)] = requiredTokens[requiredTokens.length - 1];
            requiredTokens.pop();
            emit RequiredTokenRemoved(token);
        }
    }

    function buy() external nonReentrant {
        for (uint i = 0; i < requiredTokens.length; i++) {
            doTokenPayment(requiredTokens[i]);
        }
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _mint(msg.sender, tokenId);
        emit Purchase(msg.sender);
    }

    function doTokenPayment(ERC20 token) private {
        require(
            token.allowance(msg.sender, address(this)) > 0,
            string(abi.encodePacked("Insuficient allowance for token", token.name()))
        );
        require (
            token.balanceOf(msg.sender) > 0, 
            string(abi.encodePacked("Missing token ", token.name(), " to complete purchase"))
        );
        require(
            token.transferFrom(msg.sender, address(this), 1),
            string(abi.encodePacked("Error during ", token.name(), " token transfer"))
        );
    }

    function withdrawAll() external onlyOwner nonReentrant {
        uint256 contractBalance;
        for (uint i = 0; i < requiredTokens.length; i++) {
            contractBalance = getTokenBalance(requiredTokens[i]);
            if (contractBalance > 0) {
                withdrawToken(requiredTokens[i], contractBalance);
            }
        }
    }

    function withdrawToken(ERC20 token, uint256 contractBalance) private onlyOwner {
        require(
            token.transfer(owner(), contractBalance),
            string(abi.encodePacked("Error during ", token.name(), " token transfer"))
        );
        emit Withdrawal(token.name(), contractBalance);
    }

    function getTokenBalance(ERC20 token) internal view returns(uint256) {
        return token.balanceOf(address(this));
    }
}
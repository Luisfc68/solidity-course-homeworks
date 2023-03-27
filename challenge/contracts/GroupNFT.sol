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

    event NewRequiredToken(ERC20 token);
    event RequiredTokenRemoved(ERC20 token);
    event Purchase(address buyer);
    event Withdrawal(string token, uint256 amount);
    event WithdrawalFailure(string token);


    constructor() ERC721("GroupNFT", "GNFT") {}

    function addToWhitelist(ERC20 token) external onlyOwner {
        require(getTokenIndex(token) == -1, "Token already registered");
        requiredTokens.push(token);
        try token.totalSupply() {
            emit NewRequiredToken(token);
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
            require(
                requiredTokens[i].allowance(msg.sender, address(this)) > 0,
                string(abi.encodePacked("Insuficient allowance for token", requiredTokens[i].name()))
            );
            require (
                requiredTokens[i].balanceOf(msg.sender) > 0, 
                string(abi.encodePacked("Missing token ", requiredTokens[i].name(), " to complete purchase"))
            );
            require(
                requiredTokens[i].transferFrom(msg.sender, address(this), 1),
                string(abi.encodePacked("Error during ", requiredTokens[i].name(), " token transfer"))
            );
        }
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _mint(msg.sender, tokenId);
        emit Purchase(msg.sender);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 contractBalance;
        for (uint i = 0; i < requiredTokens.length; i++) {
            contractBalance = requiredTokens[i].balanceOf(address(this));
            if (contractBalance > 0) {
                try requiredTokens[i].transfer(owner(), contractBalance) {
                    emit Withdrawal(requiredTokens[i].name(), contractBalance);
                } catch  {
                    emit WithdrawalFailure(requiredTokens[i].name());
                }
            }
        }
    }
}
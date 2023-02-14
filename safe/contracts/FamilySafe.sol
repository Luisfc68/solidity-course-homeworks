//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.17;

import "./Safe.sol";

contract FamilySafe is Safe {

    mapping(address => bool) public familyMembers;

    event FamilySafeDeposit(uint amount, uint timestamp, address user);
    event FamilySafeWithdraw(uint amount, uint timestamp, address user);

    event NewFamilyMember(address member, uint timestamp);
    event FamilyMemberRemoved(address member, uint timestamp);

    constructor (address[] memory initialMembers) {
        for (uint i = 0; i < initialMembers.length; i++) {
            familyMembers[initialMembers[i]] = true;
        }
    }

    modifier onlyOwnerOrFamily {
        require(isOwner(msg.sender) || isFamilyMember(msg.sender), 'Only owner or family allowed');
        _;
    }

    function isFamilyMember(address user) internal view returns (bool) {
        return familyMembers[user];
    }

    receive() external payable virtual override onlyOwnerOrFamily {
        emit FamilySafeDeposit(msg.value, block.timestamp, msg.sender);
    }

    function withdraw(uint amount) external virtual override onlyOwnerOrFamily {
        payable(msg.sender).transfer(amount);
        emit FamilySafeWithdraw(amount, block.timestamp, msg.sender);
    }

    function addFamilyMember(address member) external onlyOwner {
        require(!isOwner(member), "Owner can't be considered family member");
        familyMembers[member] = true;
        emit NewFamilyMember(member, block.timestamp);
    }

    function removeFamilyMember(address member) external onlyOwner {
        require(!isOwner(member), "Owner can't be considered family member");
        familyMembers[member] = false;
        emit FamilyMemberRemoved(member, block.timestamp);
    }
}
//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.17;

contract Safe {

    address private owner;

    event SafeDeposit(uint amount, uint timestamp);
    event SafeWithdraw(uint amount, uint timestamp);

    constructor() {
        owner = msg.sender;
    }
    
    function isOwner(address user) public view returns (bool) {
        return user == owner;
    }

    modifier onlyOwner() {
        require(isOwner(msg.sender), 'Only owner allowed');
        _;
    }

    receive() external payable virtual onlyOwner {
        emit SafeDeposit(msg.value, block.timestamp);
    }

    function withdraw(uint amount) external virtual onlyOwner {
        payable(msg.sender).transfer(amount);
        emit SafeWithdraw(amount, block.timestamp);
    }
}
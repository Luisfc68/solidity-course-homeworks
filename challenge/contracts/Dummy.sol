// PDX-License-Identifier: UNLICENSED

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Dummy is ERC20 {

    constructor(string memory tokenName, string memory tokenSymbol) ERC20(tokenName, tokenSymbol) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

}
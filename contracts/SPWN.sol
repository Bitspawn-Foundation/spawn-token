// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./DSAuth.sol";
import "./DSStop.sol";

contract Bitspawn is ERC20("BitSpawn Token", "SPWN"), DSAuth, DSStop {

    event Mint(address indexed guy, uint wad);
    event Burn(address indexed guy, uint wad);

    uint256 MAX_SUPPLY = 2 * 10 ** 9 * 10 ** 18; // 2,000,000,000 SPWN Token Max Supply

    // deployer address is the default admin(owner)
    // deployer address is the first address with MINT_BURN_ROLE role
    constructor () {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantAccess(MINT_BURN_ROLE, msg.sender);
    }

    function approve(address guy, uint wad) public override whenNotPaused returns (bool) {
        return super.approve(guy, wad);
    }

    function transferFrom(address src, address dst, uint wad) public override whenNotPaused returns (bool) {
        return super.transferFrom(src, dst, wad);
    }

    function mint(address guy, uint wad) public whenNotPaused {
        require(hasRole(MINT_BURN_ROLE, msg.sender), "Caller is not allowed to mint");
        require(totalSupply() + wad <= MAX_SUPPLY, "Exceeds SPWN token max totalSupply");

        _mint(guy, wad);

        emit Mint(guy, wad);
    }

    function burn(address guy, uint wad) public whenNotPaused {
        require(hasRole(MINT_BURN_ROLE, msg.sender), "Caller is not allowed to burn");

        _burn(guy, wad);

        emit Burn(guy, wad);
    }
}
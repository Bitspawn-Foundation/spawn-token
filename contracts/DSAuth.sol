// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DSAuth is Ownable, AccessControl {
    bytes32 public constant MINT_BURN_ROLE = keccak256("MINT_BURN_ROLE");

    // setOwner transfers the SPWN token contract ownership to another address
    // along with grant new owner MINT_BURN_ROLE role and remove MINT_BURN_ROLE from old owner
    // note: call transferOwnerShip will only change ownership without other roles
    function setOwner(address newOwner) public onlyOwner {
        require(newOwner != owner(), "New owner and current owner need to be different");

        address oldOwner = owner();

        transferOwnership(newOwner);

        _grantAccess(MINT_BURN_ROLE, newOwner);
        _revokeAccess(MINT_BURN_ROLE, oldOwner);

        _setupRole(DEFAULT_ADMIN_ROLE, newOwner);
        _revokeAccess(DEFAULT_ADMIN_ROLE, oldOwner);
    }

    // setAuthority performs the same action as grantMintBurnRole
    // we need setAuthority() only because the backward compatibility with previous version contract
    function setAuthority(address authorityAddress) public onlyOwner {
        grantMintBurnRole(authorityAddress);
    }

    // grantMintBurnRole grants the MINT_BURN_ROLE role to an address
    function grantMintBurnRole(address account) public onlyOwner {
        _grantAccess(MINT_BURN_ROLE, account);
    }

    // revokeMintBurnRole revokes the MINT_BURN_ROLE role from an address
    function revokeMintBurnRole(address account) public onlyOwner {
        _revokeAccess(MINT_BURN_ROLE, account);
    }

    // internal function _grantAccess grants account with given role
    function _grantAccess(bytes32 role, address account) internal {
        grantRole(role, account);

        emit RoleGranted(role, account, owner());
    }

    // internal function _revokeAccess revokes account with given role
    function _revokeAccess(bytes32 role, address account) internal {
        if (DEFAULT_ADMIN_ROLE == role) {
            require(account != owner(), "owner cant revoke himself from admin role");
        }

        revokeRole(role, account);

        emit RoleRevoked(role, account, owner());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./BlackList.sol";

contract DSAuth is AccessControl, BlackList {
    bytes32 public constant MINT_BURN_ROLE = keccak256("MINT_BURN_ROLE");

    address private _pendingOwner;
    address private _owner;

    event TransferOwnerShip(address indexed _newOwner);
    event AcceptOwnerShip(address indexed _oldOwner, address indexed _newOwner);

    constructor () {
        _owner = msg.sender;
        _pendingOwner = address(0);

        emit TransferOwnerShip(msg.sender);
    }

    // transferOwnership add a pending owner
    function transferOwnership(address newOwner) public override onlyOwner {
        require(!isBlackListed[newOwner], "Pending owner can not be in blackList");
        require(newOwner != owner(), "Pending owner and current owner need to be different");
        require(newOwner != address(0), "Pending owner can not be zero address");

        _pendingOwner = newOwner;

        emit TransferOwnerShip(newOwner);
    }

    function getPendingOwner() public view onlyOwner returns (address) {
        return _pendingOwner;
    }

    function owner() public override view returns (address) {
        return _owner;
    }

    // acceptOwnership allows the pending owner to accept the ownership of the SPWN token contract
    // along with grant new owner MINT_BURN_ROLE role and remove MINT_BURN_ROLE from old owner
    function acceptOwnership() public {
        require(_pendingOwner != address(0), "Please set pending owner first");
        require(_pendingOwner == msg.sender, "Only pending owner is able to accept the ownership");
        require(!isBlackListed[msg.sender], "Pending owner can not be in blackList");

        address oldOwner = owner();

        _owner = _pendingOwner;

        _setupRole(DEFAULT_ADMIN_ROLE, _pendingOwner);
        _grantAccess(MINT_BURN_ROLE, _pendingOwner);

        _revokeAccess(MINT_BURN_ROLE, oldOwner);
        _revokeAccess(DEFAULT_ADMIN_ROLE, oldOwner);

        emit AcceptOwnerShip(oldOwner, _pendingOwner);

        _pendingOwner = address(0);
    }

    // setAuthority performs the same action as grantMintBurnRole
    // we need setAuthority() only because the backward compatibility with previous version contract
    function setAuthority(address authorityAddress) public onlyOwner {
        require(!isBlackListed[authorityAddress], "AuthorityAddress is in blackList");

        grantMintBurnRole(authorityAddress);
    }

    // grantMintBurnRole grants the MINT_BURN_ROLE role to an address
    function grantMintBurnRole(address account) public onlyOwner {
        require(!isBlackListed[account], "account is in blackList");

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
            require(account != owner(), "owner can not revoke himself from admin role");
        }

        revokeRole(role, account);

        emit RoleRevoked(role, account, owner());
    }
}

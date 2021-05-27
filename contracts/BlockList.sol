// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockList is Ownable {
    mapping(address => bool) public isBlackListed;

    event DestroyedBlackFunds(address _blackListedUser, uint _balance);
    event AddedBlackList(address _user);
    event RemovedBlackList(address _user);

    function addBlackList(address _evilUser) public onlyOwner {
        isBlackListed[_evilUser] = true;

        emit AddedBlackList(_evilUser);
    }

    function removeBlackList(address _clearedUser) public onlyOwner {
        isBlackListed[_clearedUser] = false;

        RemovedBlackList(_clearedUser);
    }

    function getBlackListStatus(address _maker) public view returns (bool) {
        return isBlackListed[_maker];
    }
}

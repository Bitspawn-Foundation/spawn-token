// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/security/Pausable.sol";
import "./DSAuth.sol";

contract DSStop is Pausable, DSAuth {
    // we need stopped() only because the backward compatibility with previous version contract
    // stopped = paused
    function stopped() public view returns (bool) {
        return paused();
    }

    function stop() public onlyOwner {
        _pause();

        emit Paused(owner());
    }

    function start() public onlyOwner {
        _unpause();

        emit Unpaused(owner());
    }
}

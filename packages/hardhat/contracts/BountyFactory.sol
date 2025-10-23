// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Bounty.sol";

/**
 * @title BountyFactory
 * @dev A factory contract to create and deploy new Bounty contracts.
 */
contract BountyFactory {
    address[] public deployedBounties;
    address public immutable platformTreasury;

    event BountyCreated(
        address indexed bountyAddress,
        address indexed owner,
        string cid,
        uint256 amount,
        uint256 stakeAmount,
        uint256 duration
    );

    constructor(address _platformTreasury) {
        require(_platformTreasury != address(0), "Treasury required");
        platformTreasury = _platformTreasury;
    }

    /**
     * @dev Creates and deploys a new Bounty contract, funding it with the sent ETH.
     * @param _owner The address that will own the new bounty.
     * @param _cid The IPFS CID for the bounty's metadata.
     * @return The address of the newly created Bounty contract.
     */
    function createBounty(
        address _owner,
        string memory _cid,
        uint256 _stakeAmount,
        uint256 _duration
    ) external payable returns (address) {
        // Forward ETH to new bounty as reward pool
        Bounty newBounty = new Bounty{ value: msg.value }(_owner, _cid, _stakeAmount, _duration, platformTreasury);

        address newBountyAddress = address(newBounty);
        deployedBounties.push(newBountyAddress);

        emit BountyCreated(newBountyAddress, _owner, _cid, msg.value, _stakeAmount, _duration);
        return newBountyAddress;
    }

    /**
     * @dev Returns a list of all bounty contract addresses created by this factory.
     */
    function getDeployedBounties() external view returns (address[] memory) {
        return deployedBounties;
    }
}

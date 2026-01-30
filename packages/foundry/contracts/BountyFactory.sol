// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Bounty.sol";

/**
 * @title BountyFactory
 * @dev A factory contract to create and deploy new Bounty contracts.
 */
contract BountyFactory {
    address[] public deployedBounties;

    event BountyCreated(
        address indexed bountyAddress,
        address indexed owner,
        string cid,
        uint256 amount,
        uint256 stakeAmount,
        uint256 duration,
        address triager
    );

    constructor() {}

    /**
     * @dev Creates and deploys a new Bounty contract, funding it with the sent ETH.
     * @param _owner The address that will own the new bounty.
     * @param _cid The IPFS CID for the bounty's metadata.
     * @param _triager The address that will triage submissions (can be zero address).
     * @return The address of the newly created Bounty contract.
     */
    function createBounty(
        address _owner,
        string memory _cid,
        uint256 _stakeAmount,
        uint256 _duration,
        address _triager
    ) external payable returns (address) {
        // Forward ETH to new bounty as reward pool
        Bounty newBounty = new Bounty{ value: msg.value }(_owner, _cid, _stakeAmount, _duration, _triager);

        address newBountyAddress = address(newBounty);
        deployedBounties.push(newBountyAddress);

        emit BountyCreated(newBountyAddress, _owner, _cid, msg.value, _stakeAmount, _duration, _triager);
        return newBountyAddress;
    }

    /**
     * @dev Returns a list of all bounty contract addresses created by this factory.
     */
    function getDeployedBounties() external view returns (address[] memory) {
        return deployedBounties;
    }
}

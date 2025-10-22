// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Bounty.sol";

/**
 * @title BountyFactory
 * @dev A factory contract to create and deploy new Bounty contracts.
 */
contract BountyFactory {
    address[] public deployedBounties;

    event BountyCreated(address indexed bountyAddress, address indexed owner, string cid, uint256 amount);

    /**
     * @dev Creates and deploys a new Bounty contract, funding it with the sent ETH.
     * @param _owner The address that will own the new bounty.
     * @param _cid The IPFS CID for the bounty's metadata.
     * @return The address of the newly created Bounty contract.
     */
    function createBounty(address _owner, string memory _cid) external payable returns (address) {
        // CRITICAL FIX: The `value: msg.value` forwards the ETH sent with this
        // transaction to the new Bounty contract's constructor, funding it.
        Bounty newBounty = new Bounty{ value: msg.value }(_owner, _cid);

        address newBountyAddress = address(newBounty);
        deployedBounties.push(newBountyAddress);

        emit BountyCreated(newBountyAddress, _owner, _cid, msg.value);
        return newBountyAddress;
    }

    /**
     * @dev Returns a list of all bounty contract addresses created by this factory.
     */
    function getDeployedBounties() external view returns (address[] memory) {
        return deployedBounties;
    }
}

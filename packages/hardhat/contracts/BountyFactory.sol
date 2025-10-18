// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract BountyFactory {
    event BountyCreated(address indexed bountyAddress, address indexed owner, string cid);

    function createBounty(address _owner, string memory _cid) external payable returns (address) {
        Bounty newBounty = new Bounty(_owner, _cid);
        emit BountyCreated(address(newBounty), _owner, _cid);
        return address(newBounty);
    }
}

contract Bounty {
    address public owner;
    string public cid;
    uint256 public amount;

    constructor(address _owner, string memory _cid) payable {
        owner = _owner;
        cid = _cid;
        amount = msg.value;
    }
}

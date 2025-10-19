// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title Bounty
 * @dev A contract representing a single bug bounty with a locked amount of ETH.
 */
contract Bounty {
    enum Status { Open, Submitted, Approved, Rejected, Disputed }

    address public owner;
    uint256 public amount;
    string public cid; // IPFS CID for bounty details (title, description, severity)
    Status public status;
    string public reportCid; // IPFS CID for the researcher's submission
    address public researcher;
    uint256 public minStake = 0.01 ether; // minimum stake required to submit a report
    uint256 public stakedAmount; // amount staked by the researcher for the current submission

    event ReportSubmitted(address indexed researcher, string reportCid);
    event SubmissionApproved(address indexed researcher);
    event SubmissionRejected(address indexed researcher);
    event FundsReleased(address indexed researcher, uint256 amount);
    event StakeDeposited(address indexed researcher, uint256 amount);
    event StakeRefunded(address indexed researcher, uint256 amount);
    event StakeSlashed(address indexed researcher, uint256 amount, address indexed receiver);

    constructor(address _owner, string memory _cid) payable {
        require(msg.value > 0, "Bounty amount cannot be zero");
        owner = _owner;
        cid = _cid;
        amount = msg.value;
        status = Status.Open;
    }

    /**
     * @dev Allows any address to submit a report for an open bounty.
     * @param _reportCid The IPFS CID of the vulnerability report.
     */
    function submitReport(string memory _reportCid) external payable {
        require(status == Status.Open, "Bounty is not open for submissions");
        require(msg.value >= minStake, "Insufficient stake");
        researcher = msg.sender;
        reportCid = _reportCid;
        status = Status.Submitted;
        stakedAmount = msg.value;
        emit StakeDeposited(msg.sender, msg.value);
        emit ReportSubmitted(msg.sender, _reportCid);
    }

    /**
     * @dev Allows the bounty owner to approve a submission and release funds.
     */
    function approveSubmission() external {
        require(msg.sender == owner, "Only bounty owner can approve");
        require(status == Status.Submitted, "No submission to approve or already processed");
        status = Status.Approved;
        uint256 _stake = stakedAmount;
        stakedAmount = 0;
        // Payout bounty amount
        payable(researcher).transfer(amount);
        // Refund stake to researcher
        if (_stake > 0) {
            payable(researcher).transfer(_stake);
            emit StakeRefunded(researcher, _stake);
        }
        emit SubmissionApproved(researcher);
        emit FundsReleased(researcher, amount);
    }

    /**
     * @dev Allows the bounty owner to reject a submission.
     */
    function rejectSubmission() external {
        require(msg.sender == owner, "Only bounty owner can reject");
        require(status == Status.Submitted, "No submission to reject or already processed");
        status = Status.Rejected;
        uint256 _stake = stakedAmount;
        stakedAmount = 0;
        // Slash the researcher's stake and transfer to the owner as anti-spam penalty
        if (_stake > 0) {
            payable(owner).transfer(_stake);
            emit StakeSlashed(researcher, _stake, owner);
        }
        emit SubmissionRejected(researcher);
    }

    /**
     * @dev Allows the bounty owner to update the minimum stake required for submissions.
     * @param _minStake The new minimum stake in wei.
     */
    function setMinStake(uint256 _minStake) external {
        require(msg.sender == owner, "Only bounty owner can set minStake");
        minStake = _minStake;
    }
}
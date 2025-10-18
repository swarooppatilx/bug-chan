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

    event ReportSubmitted(address indexed researcher, string reportCid);
    event SubmissionApproved(address indexed researcher);
    event SubmissionRejected(address indexed researcher);
    event FundsReleased(address indexed researcher, uint256 amount);

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
    function submitReport(string memory _reportCid) external {
        require(status == Status.Open, "Bounty is not open for submissions");
        researcher = msg.sender;
        reportCid = _reportCid;
        status = Status.Submitted;
        emit ReportSubmitted(msg.sender, _reportCid);
    }

    /**
     * @dev Allows the bounty owner to approve a submission and release funds.
     */
    function approveSubmission() external {
        require(msg.sender == owner, "Only bounty owner can approve");
        require(status == Status.Submitted, "No submission to approve or already processed");
        status = Status.Approved;
        payable(researcher).transfer(amount);
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
        emit SubmissionRejected(researcher);
    }
}
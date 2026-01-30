// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Bounty
 * @dev A contract representing a single bug bounty with a locked amount of ETH.
 */
contract Bounty {
    // Bounty-level status: only Open or Closed
    enum Status {
        Open,
        Closed
    }

    // Per-submission status
    enum SubmissionState {
        None,
        Pending,
        Accepted,
        Rejected,
        Refunded
    }

    // Visibility for submissions
    enum Visibility {
        Private, // encrypted CID (off-chain decryption)
        Public // plaintext CID (public)
    }

    // Severity levels for triage
    enum Severity {
        None,
        Low,
        Medium,
        High,
        Critical
    }

    address public owner;
    address public triager; // Triager can view reports and assign severity
    uint256 public amount;
    string public cid; // IPFS CID for bounty details (title, description, severity)
    Status public status;
    uint256 public immutable stakeAmount; // fixed stake decided by the bounty creator, immutable
    uint256 public immutable endTime; // timestamp when bounty closes automatically
    // No platform treasury. All monetary flows remain between the bounty contract and researchers.

    struct Submission {
        string reportCid;
        uint256 stake;
        SubmissionState state;
        Visibility visibility; // 0=Private, 1=Public
        Severity severity; // Assigned by triager
    }

    mapping(address => Submission) private _submissions; // per-wallet single submission
    address[] private _submitters;

    event ReportSubmitted(address indexed researcher, string reportCid);
    event SubmissionAccepted(address indexed researcher);
    event SubmissionRejected(address indexed researcher);
    event FundsReleased(address indexed researcher, uint256 amount);
    event StakeDeposited(address indexed researcher, uint256 amount);
    event StakeRefunded(address indexed researcher, uint256 amount);
    event StakeSlashed(address indexed researcher, uint256 amount, address indexed receiver);
    event BountyClosed(uint256 winners, uint256 totalPaid);
    event SeveritySet(address indexed researcher, Severity severity);
    event SubmissionVisibilityChanged(address indexed researcher, Visibility visibility, string cid);

    constructor(address _owner, string memory _cid, uint256 _stakeAmount, uint256 _duration, address _triager) payable {
        require(msg.value > 0, "Bounty amount cannot be zero");
        require(_stakeAmount > 0, "Stake amount must be > 0");
        require(_duration > 0, "Duration must be > 0");
        owner = _owner;
        triager = _triager;
        cid = _cid;
        amount = msg.value;
        status = Status.Open;
        stakeAmount = _stakeAmount;
        endTime = block.timestamp + _duration;
    }

    /**
     * @dev Allows any address to submit a report for an open bounty.
     * @param _reportCid The IPFS CID of the vulnerability report.
     */
    function submitReport(string memory _reportCid) external payable {
        require(status == Status.Open, "Bounty is not open for submissions");
        require(block.timestamp < endTime, "Bounty duration ended");
        require(msg.value == stakeAmount, "Stake must equal fixed amount");
        Submission storage subm = _submissions[msg.sender];
        require(subm.state == SubmissionState.None, "Already submitted from this wallet");

        subm.reportCid = _reportCid;
        subm.stake = msg.value;
        subm.state = SubmissionState.Pending;
        subm.visibility = Visibility.Private; // default to Private
        _submitters.push(msg.sender);

        emit StakeDeposited(msg.sender, msg.value);
        emit ReportSubmitted(msg.sender, _reportCid);
    }

    /**
     * @dev Allows the bounty owner to approve a submission and release funds.
     */
    function acceptSubmission(address _researcher) external {
        require(msg.sender == owner, "Only bounty owner can accept");
        require(status == Status.Open, "Bounty not open");
        Submission storage subm = _submissions[_researcher];
        require(subm.state == SubmissionState.Pending, "No pending submission from this address");

        // Mark accepted and slash stake back to bounty creator (anti-spam)
        subm.state = SubmissionState.Accepted;
        uint256 _stake = subm.stake;
        subm.stake = 0;
        if (_stake > 0) {
            payable(owner).transfer(_stake);
            emit StakeSlashed(_researcher, _stake, owner);
        }
        emit SubmissionAccepted(_researcher);
    }

    /**
     * @dev Allows the bounty owner to reject a submission.
     */
    function rejectSubmission(address _researcher) external {
        require(msg.sender == owner, "Only bounty owner can reject");
        require(status == Status.Open, "Bounty not open");
        Submission storage subm = _submissions[_researcher];
        require(subm.state == SubmissionState.Pending, "No submission to reject or already processed");

        subm.state = SubmissionState.Rejected;
        uint256 _stake = subm.stake;
        subm.stake = 0;
        // Slash the researcher's stake back to bounty creator (anti-spam)
        if (_stake > 0) {
            payable(owner).transfer(_stake);
            emit StakeSlashed(_researcher, _stake, owner);
        }
        emit SubmissionRejected(_researcher);
    }

    /**
     * @dev Allows owner to close the bounty at any time. Distributes rewards and refunds stakes.
     */
    function close() external {
        require(msg.sender == owner, "Only owner");
        require(status == Status.Open, "Already closed");
        _closeAndSettle();
    }

    /**
     * @dev Allows anyone to close after the duration has passed.
     */
    function closeIfExpired() external {
        require(status == Status.Open, "Already closed");
        require(block.timestamp >= endTime, "Not yet expired");
        _closeAndSettle();
    }

    function _closeAndSettle() internal {
        status = Status.Closed;

        // Count winners
        uint256 winners = 0;
        for (uint256 i = 0; i < _submitters.length; i++) {
            Submission storage s = _submissions[_submitters[i]];
            if (s.state == SubmissionState.Accepted) {
                winners++;
            }
        }

        uint256 totalPaid = 0;
        if (winners > 0 && amount > 0) {
            uint256 share = amount / winners;
            uint256 remainder = amount - (share * winners);
            for (uint256 i = 0; i < _submitters.length; i++) {
                Submission storage s = _submissions[_submitters[i]];
                if (s.state == SubmissionState.Accepted) {
                    payable(_submitters[i]).transfer(share);
                    totalPaid += share;
                }
            }
            if (remainder > 0) {
                // send dust back to creator
                payable(owner).transfer(remainder);
                // not counted as totalPaid (only winners' payouts)
            }
            amount = 0;
        } else if (winners == 0 && amount > 0) {
            // No winners: return bounty to creator
            payable(owner).transfer(amount);
            amount = 0;
        }

        // Refund stakes for untouched submissions (Pending -> Refunded)
        for (uint256 i = 0; i < _submitters.length; i++) {
            Submission storage s2 = _submissions[_submitters[i]];
            if (s2.state == SubmissionState.Pending) {
                uint256 st = s2.stake;
                s2.stake = 0;
                s2.state = SubmissionState.Refunded;
                if (st > 0) {
                    payable(_submitters[i]).transfer(st);
                    emit StakeRefunded(_submitters[i], st);
                }
            }
        }
        emit BountyClosed(winners, totalPaid);
    }

    /**
     * @dev Update a submission's visibility and CID.
     * Only bounty owner, triager, or the submission's researcher can call it.
     * Researcher cannot publish while Pending or while owner is fixing.
     */
    function setSubmissionVisibility(address _researcher, Visibility _visibility, string calldata _newCid) external {
        Submission storage subm = _submissions[_researcher];
        require(subm.state != SubmissionState.None, "No submission");

        bool isOwner = msg.sender == owner;
        bool isTriager = msg.sender == triager;
        bool isResearcher = msg.sender == _researcher;
        require(isOwner || isTriager || isResearcher, "Not allowed");

        if (isResearcher) {
            require(subm.state != SubmissionState.Pending, "Not allowed while Pending");
        }

        subm.reportCid = _newCid;
        subm.visibility = _visibility;
        emit SubmissionVisibilityChanged(_researcher, _visibility, _newCid);
    }

    /**
     * @dev Set the severity of a submission. Only the triager can call this.
     * @param _researcher The address of the researcher whose submission to update.
     * @param _severity The severity level to assign.
     */
    function setSeverity(address _researcher, Severity _severity) external {
        require(msg.sender == triager, "Only triager can set severity");
        Submission storage subm = _submissions[_researcher];
        require(subm.state != SubmissionState.None, "No submission");
        subm.severity = _severity;
        emit SeveritySet(_researcher, _severity);
    }
    /**
     * @dev Returns the list of submitter addresses.
     */
    function getSubmitters() external view returns (address[] memory) {
        return _submitters;
    }

    /**
     * @dev Returns a submission details for a given researcher.
     */
    function getSubmission(
        address _researcher
    ) external view returns (string memory, uint256, SubmissionState, Visibility, Severity) {
        Submission storage s = _submissions[_researcher];
        return (s.reportCid, s.stake, s.state, s.visibility, s.severity);
    }
}

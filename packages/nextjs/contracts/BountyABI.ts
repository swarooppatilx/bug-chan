// Enum string maps for UI
export const BountyStatus = ["Open", "Closed"] as const;
export const SubmissionStatus = [
  "None",
  "Pending",
  "Accepted",
  "Rejected",
  "Refunded",
] as const;

// The ABI can be found in packages/hardhat/generated/artifacts/Bounty.js
export const bountyABI = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_owner",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_cid",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "_stakeAmount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_duration",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "_triager",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "payable"
        },
        {
            "type": "function",
            "name": "acceptSubmission",
            "inputs": [
                {
                    "name": "_researcher",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "amount",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "cid",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "close",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "closeIfExpired",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "endTime",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getSubmission",
            "inputs": [
                {
                    "name": "_researcher",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "",
                    "type": "uint8",
                    "internalType": "enum Bounty.SubmissionState"
                },
                {
                    "name": "",
                    "type": "uint8",
                    "internalType": "enum Bounty.Visibility"
                },
                {
                    "name": "",
                    "type": "uint8",
                    "internalType": "enum Bounty.Severity"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getSubmitters",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address[]",
                    "internalType": "address[]"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "rejectSubmission",
            "inputs": [
                {
                    "name": "_researcher",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setSeverity",
            "inputs": [
                {
                    "name": "_researcher",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_severity",
                    "type": "uint8",
                    "internalType": "enum Bounty.Severity"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "setSubmissionVisibility",
            "inputs": [
                {
                    "name": "_researcher",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_visibility",
                    "type": "uint8",
                    "internalType": "enum Bounty.Visibility"
                },
                {
                    "name": "_newCid",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "stakeAmount",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "status",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint8",
                    "internalType": "enum Bounty.Status"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "submitReport",
            "inputs": [
                {
                    "name": "_reportCid",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [],
            "stateMutability": "payable"
        },
        {
            "type": "function",
            "name": "triager",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "event",
            "name": "BountyClosed",
            "inputs": [
                {
                    "name": "winners",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "totalPaid",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "FundsReleased",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "ReportSubmitted",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "reportCid",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "SeveritySet",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "severity",
                    "type": "uint8",
                    "indexed": false,
                    "internalType": "enum Bounty.Severity"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "StakeDeposited",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "StakeRefunded",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "StakeSlashed",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                },
                {
                    "name": "receiver",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "SubmissionAccepted",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "SubmissionRejected",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "SubmissionVisibilityChanged",
            "inputs": [
                {
                    "name": "researcher",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "visibility",
                    "type": "uint8",
                    "indexed": false,
                    "internalType": "enum Bounty.Visibility"
                },
                {
                    "name": "cid",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        }
    ] as const;

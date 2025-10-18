// This file is manually created to store the ABI for the `Bounty` contract.
// The ABI can be found in `packages/hardhat/artifacts/contracts/Bounty.sol/Bounty.json` after compiling.

export const bountyABI = [
  {
    inputs: [
      { internalType: "address", name: "_owner", type: "address" },
      { internalType: "string", name: "_cid", type: "string" },
    ],
    stateMutability: "payable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "researcher", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "FundsReleased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "researcher", type: "address" },
      { indexed: false, internalType: "string", name: "reportCid", type: "string" },
    ],
    name: "ReportSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "researcher", type: "address" }],
    name: "SubmissionApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "researcher", type: "address" }],
    name: "SubmissionRejected",
    type: "event",
  },
  {
    inputs: [],
    name: "amount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "approveSubmission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cid",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rejectSubmission",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "reportCid",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "researcher",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "status",
    outputs: [{ internalType: "enum Bounty.Status", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_reportCid", type: "string" }],
    name: "submitReport",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// A simple mapping from the contract's enum number to a readable string
export const BountyStatus = ["Open", "Submitted", "Approved", "Rejected", "Disputed"];

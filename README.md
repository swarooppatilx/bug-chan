# BugChan
[BugChan](https://bugchan.xyz) is a decentralized bug-bounty platform. It makes vulnerability disclosure transparent, trustless, and censorship-resistant by combining on‑chain escrow, encrypted off‑chain reports, and a robust, incentive-aligned workflow.

---

[![screenshot](screenshot.png)](https://bugchan.xyz)

## Overview

BugChan redefines the bug bounty process for the Web3 era. It empowers projects to launch secure, on-chain bounty programs where rewards are locked in a smart contract escrow. Security researchers can submit confidential, encrypted reports to IPFS via Lighthouse. The entire lifecycle from submission and review to reward distribution and public disclosure is governed by transparent, auditable smart contract logic, eliminating payment disputes and censorship risk.

---

## Tech Stack

-   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
-   **Smart Contracts:** Solidity, Hardhat
-   **Wallets & Blockchain Interaction:** Wagmi, Viem, RainbowKit
-   **Decentralized Storage:** Lighthouse SDK for client-side encryption and IPFS uploads
-   **Payments & Escrow:** On-chain via Solidity smart contracts

---

## Key Integrations & Partners

BugChan leverages a suite of cutting-edge Web3 technologies to deliver its decentralized functionality:

*   **Hardhat:** The smart contract development, testing, and deployment environment is powered by Hardhat v3. It provides a local Ethereum network with debugging and stack traces, scriptable deployment workflows, and contract verification helpers used across the repository.
*   **Pyth Network:** To provide accurate, real-time ETH/USD price feeds on the frontend, BugChan integrates with the Pyth Network. It uses the **Hermes SDK** and an on-chain **Pull Oracle** model to fetch and display reliable price data.
*   **BlockScout:** The project features **Autoscout**, a dedicated block explorer instance available at `explorer.bugchan.xyz`, providing a detailed view of on-chain activities.
*   **Lighthouse:** Lighthouse is used for client-side encryption of vulnerability reports, decentralized storage on IPFS, and managing decryption access control for bounty owners.

---

## Core Features

-   **Guaranteed On‑Chain Escrow:** Bounty rewards are locked in a dedicated smart contract upon creation, ensuring funds are secure, auditable, and programmatically released to winners.
-   **Confidential Encrypted Submissions:** Researchers' reports are end-to-end encrypted in the browser before being uploaded to IPFS. Decryption keys are shared only with the bounty owner, protecting sensitive vulnerability details.
-   **Automated & Fair Payouts:** Upon closing a bounty, the smart contract automatically splits and distributes the total reward equally among all approved researchers. If there are no winners, the funds are returned to the project owner.
-   **Incentive-Aligned Anti‑Spam:** Researchers stake ETH to submit a report. If the report is accepted or rejected, the stake is transferred to the bounty owner as compensation for their review time. Stakes for unreviewed reports are automatically refunded when the bounty expires, ensuring fairness.
-   **Transparent Public Disclosure Workflow:** The platform includes an on-chain mechanism for either the researcher or the owner to publicly disclose a vulnerability after it has been addressed, creating an immutable and transparent historical record.
-   **Immutable Deadlines:** Bounties have a fixed duration. After the deadline,  settlement process takes place ensuring finality and preventing programs from remaining open indefinitely.
-   **Comprehensive On-Chain History:** All critical actions bounty creation, submission CIDs, status changes, and final payouts are recorded on the blockchain, providing a fully auditable trail.

---

## Architecture & Lifecycle Overview

The platform operates through a well-defined, multi-step lifecycle governed by smart contracts:

1.  **Bounty Creation & Funding:** A project owner uses the frontend to define a bounty's scope, reward, stake amount, and duration. This metadata is uploaded to IPFS, and a `createBounty` transaction is sent to the `BountyFactory` contract, which deploys a new `Bounty` contract and locks the reward amount in escrow.
2.  **Report Submission & Staking:** A security researcher prepares a vulnerability report. Using the BugChan UI, the report is encrypted and uploaded to IPFS via Lighthouse. The researcher then calls the `submitReport` function on the `Bounty` contract, providing the report's IPFS CID and the required ETH stake.
3.  **Confidential Review:** The bounty owner receives access to decrypt and review the submitted report. They can then call `acceptSubmission` or `rejectSubmission` on-chain. In either case, the researcher's stake is transferred to the owner.
4.  **Bounty Closure & Settlement:** The bounty is closed either manually by the owner (`close`) or after the deadline (`closeIfExpired`). The `Bounty` contract then executes the settlement logic:
    *   Distributes the reward pool to all accepted submissions.
    *   Refunds stakes for any submissions that were never reviewed.
    *   Returns the principal to the owner if no submissions were accepted.
5.  **Public Disclosure (Optional):** After a vulnerability is resolved, the owner or researcher can choose to make the report public. This involves uploading a plaintext version to IPFS and calling `setSubmissionVisibility` to update the on-chain record with the new public CID.

---

Notes:
- Prototype: under active development.
- Built using [Scaffold-ETH](https://scaffoldeth.io/) (Scaffold-ETH 2)
- Post that inspired this project: Daniel Stenberg — LinkedIn post on his HackerOne / curl experience and responsible vulnerability disclosure. See: https://www.linkedin.com/posts/danielstenberg_hackerone-curl-activity-7324820893862363136-glb1
- License: [MIT](https://opensource.org/licenses/MIT)
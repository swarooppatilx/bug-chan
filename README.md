# BugChan
BugChan is a decentralized bug-bounty platform built at [ETHOnline 2025](https://ethglobal.com/events/ethonline2025/). It makes vulnerability disclosure transparent, trustless, and censorship-resistant by combining on‑chain escrow, encrypted off‑chain reports, and blockchain-native attestations.

---

## Overview

- Projects post bounties on-chain and lock rewards in escrow.  
- Researchers submit encrypted vulnerability reports to IPFS (via Lighthouse).  
- Approved reports trigger automated payouts from escrow.

---

## Tech stack

- Frontend: Next.js (App Router) + Tailwind CSS  
- Smart contracts: Solidity, Hardhat  
- Wallets: Wagmi + RainbowKit  
- Storage: Lighthouse
- Payments: Stablecoin escrow

---

## Core features

- On‑chain escrow: secure, auditable funds lockup.  
- Encrypted submissions: private uploads via Lighthouse.  
- Automatic payouts: smart contracts release rewards on approval.  
- Transparent history: all bounties & payouts visible on-chain.  
- Tokenomics & anti‑spam: stake requirement for submissions; forfeited stake funds the system & deters spam.  
- Reputation: attestations provide on‑chain trust signals.

---

## Architecture overview

1. User posts bounty via frontend → smart contract creates escrow.  
2. Researcher encrypts report and uploads to Lighthouse/IPFS. CID and encryption metadata are stored off‑chain; reference is added on‑chain as needed.  
3. Project reviews submission; on approval, the contract releases funds to researcher.  

---

## Getting started

Prerequisites: Node.js (16+), Yarn, Hardhat-compatible environment, a wallet (MetaMask / Rainbow).

Clone and install:

```bash
git clone https://github.com/swarooppatilx/bug-chan.git
cd bug-chan
yarn install
```


Local development (quick start):

```bash
# Start local Hardhat node
yarn chain

# Deploy contracts to local network
yarn deploy

# Run frontend
yarn start
# Open http://localhost:3000
```

---

## Development

- Run tests:

```bash
yarn test       # runs Solidity and JS tests
```

- Lint & format:

```bash
yarn lint
yarn format
```

- Common Hardhat tasks:

```bash
yarn hardhat compile
yarn hardhat test
```

Notes:
- Prototype: under active development.
- Built using [Scaffold-ETH](https://scaffoldeth.io/) (Scaffold-ETH2)
- License: [MIT](https://opensource.org/licenses/MIT)

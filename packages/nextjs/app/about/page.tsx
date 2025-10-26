import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BanknotesIcon,
  BoltIcon,
  BugAntIcon,
  CloudArrowUpIcon,
  CubeTransparentIcon,
  LockClosedIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata: Metadata = getMetadata({
  title: "About",
  description: "About BugChan — a decentralized bug bounty platform.",
});

function Feature({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-800 p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        {children}
        <span className="font-roboto">{title}</span>
      </div>
      {description && <p className="text-sm text-gray-300">{description}</p>}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <h1 className="font-akira text-4xl leading-tight">About BugChan</h1>
            <p className="text-gray-300 font-roboto text-lg">
              BugChan is a decentralized bug bounty platform with on-chain escrow and client-side encryption to secure
              reports.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/bounties/create"
                className="bg-[var(--color-primary)] hover:opacity-90 text-white px-6 py-3 inline-flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Start a Program
              </Link>
              <Link
                href="/bounties"
                className="border border-[var(--color-secondary)]/50 hover:border-[var(--color-secondary)] text-white px-6 py-3 inline-flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Explore Bounties
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative w-full h-64 lg:h-80">
            <Image src="/hero/shield.svg" alt="Security shield" fill style={{ objectFit: "contain" }} />
          </div>
        </div>

        {/* Features */}
        <div className="mt-14">
          <h2 className="text-2xl font-roboto font-light mb-6">Why BugChan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Feature
              title="Guaranteed Payouts"
              description="On-chain escrow ensures all rewards are automatically released."
            >
              <ShieldCheckIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
            <Feature
              title="Aligned Incentives"
              description="Stakes are slashed to the bounty owner for rejected reports."
            >
              <NoSymbolIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
            <Feature
              title="Confidential & Secure"
              description="Reports are encrypted in the browser and stored on IPFS."
            >
              <LockClosedIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
            <Feature title="Transparent" description="Every action is on-chain and fully auditable.">
              <CubeTransparentIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
          </div>
        </div>

        {/* Technology */}
        <div className="mt-10 border border-gray-800 p-5">
          <div className="flex items-start gap-3">
            <BoltIcon className="h-6 w-6 text-[var(--color-secondary)] mt-0.5" />
            <div>
              <h3 className="font-roboto font-normal mb-1">Technology & Integrations</h3>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1 mt-2">
                <li>
                  <strong>Hardhat 3:</strong> Smart contract development and testing.
                </li>
                <li>
                  <strong>Pyth Network:</strong> Real-time ETH/USD price feeds via Hermes SDK.
                </li>
                <li>
                  <strong>BlockScout:</strong> Autoscout instance for inspecting and verifying transactions.
                </li>
                <li>
                  <strong>Lighthouse:</strong> Client-side encryption and decentralized report storage.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Model */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 border border-gray-800 p-5">
            <div className="flex items-start gap-3 mb-3">
              <LockClosedIcon className="h-6 w-6 text-[var(--color-secondary)] mt-0.5" />
              <h3 className="font-roboto font-normal">Security Model</h3>
            </div>
            <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
              <li>Smart contracts manage escrow and payouts.</li>
              <li>Encrypted reports stored on IPFS; only referenced on-chain.</li>
              <li>Client-side encryption ensures only owners can decrypt.</li>
              <li>Stake mechanism deters spam submissions.</li>
            </ul>
          </div>
          <div className="lg:col-span-5 border border-gray-800 p-5">
            <div className="flex items-start gap-3 mb-3">
              <ShieldCheckIcon className="h-6 w-6 text-[var(--color-secondary)] mt-0.5" />
              <h3 className="font-roboto font-normal">Requirements</h3>
            </div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>Sepolia testnet wallet with ETH for gas fees.</li>
              <li>
                <a href="https://metamask.io/download.html" target="_blank" rel="noreferrer" className="underline">
                  Install MetaMask
                </a>
              </li>
              <li>
                <a
                  href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Get Sepolia ETH
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h2 className="text-2xl font-roboto font-light mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-800 p-5">
              <h3 className="flex items-center gap-2 mb-2">
                <CloudArrowUpIcon className="h-5 w-5 text-[var(--color-secondary)]" /> For Project Owners
              </h3>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                <li>Lock rewards in on-chain escrow.</li>
                <li>Confidentially review encrypted submissions.</li>
                <li>Accept valid or reject invalid reports; receive slashed stakes.</li>
                <li>Close bounty for automatic reward distribution.</li>
              </ul>
            </div>
            <div className="border border-gray-800 p-5">
              <h3 className="flex items-center gap-2 mb-2">
                <BugAntIcon className="h-5 w-5 text-[var(--color-secondary)]" /> For Researchers
              </h3>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                <li>Browse bounties with guaranteed pools.</li>
                <li>Submit encrypted findings via IPFS.</li>
                <li>Stake ETH per submission; one per wallet.</li>
                <li>Receive reward if accepted; stake refunded if bounty expires.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Rewards & Incentives */}
        <div className="mt-10 border border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BanknotesIcon className="h-6 w-6 text-[var(--color-secondary)]" />
            <h3 className="font-roboto font-normal">Rewards & Incentives</h3>
          </div>
          <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
            <li>Guaranteed escrow for all bounty rewards.</li>
            <li>Equal reward split among accepted submissions.</li>
            <li>Stake-to-submit mechanism prevents spam.</li>
            <li>Slashed stakes go to bounty owner if rejected.</li>
            <li>Stake refunded if bounty expires before review.</li>
            <li>One submission per wallet per bounty.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

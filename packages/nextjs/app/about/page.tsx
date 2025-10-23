import Image from "next/image";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
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

export const metadata = getMetadata({
  title: "About | BugChan",
  description: "Learn what BugChan is, how it works, and why onchain bug bounties matter.",
});

export default function AboutPage() {
  return (
    <div className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <h1 className="font-akira text-4xl leading-tight">About BugChan</h1>
            <p className="text-gray-300 font-roboto text-lg">
              BugChan is a decentralized bug bounty platform for Web3. Projects launch transparent onchain bounty
              programs, and researchers submit reproducible reports with a small stake to reduce spam. Rewards are
              distributed based on outcomes, all verifiable onchain.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/bounties/create"
                className="bg-[var(--color-primary)] hover:opacity-90 text-white px-6 py-3 inline-flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Start a program
              </Link>
              <Link
                href="/bounties"
                className="border border-[var(--color-secondary)]/50 hover:border-[var(--color-secondary)] text-white px-6 py-3 inline-flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Explore bounties
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative w-full h-64 lg:h-80">
              <Image src="/hero/shield.svg" alt="Security shield" fill style={{ objectFit: "contain" }} />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-14">
          <h2 className="text-2xl font-roboto font-light mb-6">Why BugChan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Feature
              title="Onchain transparency"
              description="Budgets, reward tiers, and timelines are public and auditable."
            >
              <ShieldCheckIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
            <Feature title="Spam‑resistant" description="Stake per submission discourages spam and rewards quality.">
              <NoSymbolIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
            <Feature title="Researcher‑friendly" description="Clear scope, fast feedback, fair rewards.">
              <BugAntIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
            <Feature title="Programmable payouts" description="Composable bounties built for Web3.">
              <CubeTransparentIcon className="h-7 w-7 text-[var(--color-secondary)]" />
            </Feature>
          </div>
        </div>

        {/* Technology */}
        <div className="mt-10 border border-gray-800 p-5">
          <div className="flex items-start gap-3">
            <BoltIcon className="h-6 w-6 text-[var(--color-secondary)] mt-0.5" />
            <div>
              <h3 className="font-roboto font-normal mb-1">Technology</h3>
              <p className="text-gray-300 text-sm">
                BugChan provides a decentralized bug bounty platform that operates on the Sepolia testnet. The platform
                uses smart contracts to track submissions, stakes, and rewards while storing encrypted vulnerability
                reports on IPFS.
              </p>
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
              <li>On‑chain: Smart contracts record bounty details, report references, and stakes</li>
              <li>Off‑chain (IPFS): Bounty documentation and vulnerability reports</li>
              <li>Client‑side encryption: Ensures reports are only readable by authorized parties</li>
              <li>Stake mechanism: Researchers stake ETH to submit reports, discouraging spam</li>
            </ul>
          </div>
          <div className="lg:col-span-5 border border-gray-800 p-5">
            <div className="flex items-start gap-3 mb-3">
              <ShieldCheckIcon className="h-6 w-6 text-[var(--color-secondary)] mt-0.5" />
              <h3 className="font-roboto font-normal">Requirements</h3>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              BugChan operates on the Sepolia testnet. All interactions require a connected wallet with Sepolia ETH for
              transaction fees.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://metamask.io/download.html"
                target="_blank"
                rel="noreferrer"
                className="border border-[var(--color-secondary)]/50 hover:border-[var(--color-secondary)] px-4 py-2 inline-flex items-center gap-2 transition-all duration-300"
              >
                Install MetaMask
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noreferrer"
                className="border border-[var(--color-secondary)]/50 hover:border-[var(--color-secondary)] px-4 py-2 inline-flex items-center gap-2 transition-all duration-300"
              >
                Get Sepolia ETH
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-12">
            <h2 className="text-2xl font-roboto font-light mb-4">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CloudArrowUpIcon className="h-5 w-5 text-[var(--color-secondary)]" />
                  <h3 className="font-roboto font-normal">For project owners</h3>
                </div>
                <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1">
                  <li>Create bounty with detailed scope and reward treasury</li>
                  <li>Review submitted vulnerability reports</li>
                  <li>Accept valid reports and reject invalid submissions</li>
                  <li>Close bounty to distribute rewards to approved researchers</li>
                </ol>
              </div>
              <div className="border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BugAntIcon className="h-5 w-5 text-[var(--color-secondary)]" />
                  <h3 className="font-roboto font-normal">For security researchers</h3>
                </div>
                <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1">
                  <li>Browse open bounties and review scope documentation</li>
                  <li>Prepare and encrypt vulnerability reports</li>
                  <li>Submit findings with required stake amount</li>
                  <li>Receive rewards for accepted reports when bounty closes</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Rewards & Incentives */}
        <div className="mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12">
              <div className="border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BanknotesIcon className="h-6 w-6 text-[var(--color-secondary)]" />
                  <h3 className="font-roboto font-normal">Rewards & Incentives</h3>
                </div>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>Projects fund a treasury that distributes rewards when the bounty closes</li>
                  <li>Researchers must stake ETH to submit reports, which is returned upon acceptance</li>
                  <li>Multiple submissions allowed with fixed stake amount per submission</li>
                  <li>Rejected reports result in slashed stake; pending reports are refunded when bounty closes</li>
                  <li>Rewards are distributed according to report quality and severity tiers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-800 p-5 h-full">
      <div className="flex items-center gap-3 mb-2">
        {children}
        <span className="font-roboto">{title}</span>
      </div>
      {description && <p className="text-sm text-gray-300">{description}</p>}
    </div>
  );
}

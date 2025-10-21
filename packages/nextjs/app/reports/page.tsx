"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { BugAntIcon, InboxIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type ReportItem = {
  bounty: `0x${string}`;
  owner: string;
  researcher: string;
  reportCid: string;
  status: number;
  amount: bigint;
  stakedAmount: bigint;
};

export default function ReportsPage() {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"Submitted" | "All">("Submitted");

  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

  const contractsToRead = useMemo(() => {
    return (deployedBounties || []).flatMap(addr => [
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "owner" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "status" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "reportCid" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "researcher" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "amount" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "stakedAmount" },
    ]);
  }, [deployedBounties]);

  const { data: onchain, isLoading: isLoadingData } = useReadContracts({
    contracts: contractsToRead,
    query: { refetchInterval: 20000 },
  });

  const reports: ReportItem[] = useMemo(() => {
    if (!onchain || !deployedBounties) return [];
    const out: ReportItem[] = [];
    for (let i = 0; i < onchain.length; i += 6) {
      const idx = i / 6;
      const bounty = deployedBounties[idx] as `0x${string}`;
      const owner = (onchain[i]?.result || "0x0") as string;
      const status = (onchain[i + 1]?.result || 0) as number;
      const reportCid = (onchain[i + 2]?.result || "") as string;
      const researcher = (onchain[i + 3]?.result || "0x0") as string;
      const amount = (onchain[i + 4]?.result || 0n) as bigint;
      const stakedAmount = (onchain[i + 5]?.result || 0n) as bigint;
      if (!reportCid) continue;
      out.push({ bounty, owner, researcher, reportCid, status, amount, stakedAmount });
    }
    return out.filter(r => r.owner.toLowerCase() === (connectedAddress || "").toLowerCase());
  }, [onchain, deployedBounties, connectedAddress]);

  const filtered = useMemo(() => {
    if (activeTab === "Submitted") return reports.filter(r => r.status === 1);
    return reports;
  }, [reports, activeTab]);

  const isLoading = isLoadingAddresses || (isLoadingData && reports.length === 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-akira flex items-center gap-3 text-white">
          <BugAntIcon className="h-8 w-8 text-[var(--color-secondary)]" />
          Reports
        </h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 font-roboto text-sm font-medium transition-all duration-300 ${
              activeTab === "Submitted"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Submitted")}
          >
            Submitted
          </button>
          <button
            className={`px-4 py-2 font-roboto text-sm font-medium transition-all duration-300 ${
              activeTab === "All"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("All")}
          >
            All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="h-12 w-12 border-4 border-[var(--color-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-roboto">Loading reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-900 border border-gray-800 p-12">
          <InboxIcon className="h-16 w-16 text-gray-600 mb-4" />
          <p className="text-gray-400 font-roboto">No reports found for your bounties.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div
              key={r.bounty}
              className="bg-gray-900 border border-gray-800 hover:border-[var(--color-secondary)]/50 p-6 transition-all duration-300 hover:scale-105"
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`px-3 py-1 text-xs font-roboto font-medium ${
                    r.status === 1
                      ? "bg-purple-900/30 text-purple-400 border border-purple-700"
                      : r.status === 2
                        ? "bg-green-900/30 text-green-400 border border-green-700"
                        : r.status === 3
                          ? "bg-red-900/30 text-red-400 border border-red-700"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
                >
                  {BountyStatus[r.status]}
                </div>
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-[var(--color-secondary)] text-xs font-roboto font-medium">
                  {formatEther(r.amount)} ETH
                </span>
              </div>
              <div className="mt-2 space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 font-roboto text-xs block mb-1">Bounty</span>
                  <Address address={r.bounty} format="short" />
                </div>
                <div>
                  <span className="text-gray-500 font-roboto text-xs block mb-1">Researcher</span>
                  <Address address={r.researcher} format="short" />
                </div>
                <div className="truncate">
                  <span className="text-gray-500 font-roboto text-xs block mb-1">CID</span>
                  <span className="font-mono text-xs text-gray-400">{r.reportCid}</span>
                </div>
              </div>
              <Link
                href={`/reports/${r.bounty}`}
                className="block w-full text-center px-4 py-2 mt-4 bg-[var(--color-secondary)] hover:opacity-90 text-black font-roboto text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              >
                View Report
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

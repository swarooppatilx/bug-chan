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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BugAntIcon className="h-6 w-6" />
          Reports
        </h1>
        <div className="join">
          <button
            className={`btn btn-sm join-item ${activeTab === "Submitted" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("Submitted")}
          >
            Submitted
          </button>
          <button
            className={`btn btn-sm join-item ${activeTab === "All" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("All")}
          >
            All
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <span className="loading loading-spinner loading-lg" />
          <p className="mt-4">Loading reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/60">
          <InboxIcon className="h-10 w-10 mb-2" />
          <p>No reports found for your bounties.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div key={r.bounty} className="card bg-base-100 shadow-md">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div
                    className={`badge ${
                      r.status === 1
                        ? "badge-accent"
                        : r.status === 2
                          ? "badge-success"
                          : r.status === 3
                            ? "badge-error"
                            : "badge-ghost"
                    }`}
                  >
                    {BountyStatus[r.status]}
                  </div>
                  <span className="badge badge-outline">{formatEther(r.amount)} ETH</span>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <span className="text-base-content/60 mr-1">Bounty</span>
                    <Address address={r.bounty} format="short" />
                  </div>
                  <div>
                    <span className="text-base-content/60 mr-1">Researcher</span>
                    <Address address={r.researcher} format="short" />
                  </div>
                  <div className="truncate">
                    <span className="text-base-content/60 mr-1">CID</span>
                    <span className="font-mono text-xs">{r.reportCid}</span>
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <Link href={`/reports/${r.bounty}`} className="btn btn-secondary btn-sm w-full">
                    View Report
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

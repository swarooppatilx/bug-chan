"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther, parseAbiItem } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContracts } from "wagmi";
import { BugAntIcon, InboxIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { SubmissionStatus, bountyABI } from "~~/contracts/BountyABI";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type ReportItem = {
  bounty: `0x${string}`;
  owner: string;
  researcher: string;
  reportCid: string;
  bountyStatus: number;
  subState: number;
  amount: bigint;
  stake: bigint;
};

export default function ReportsPage() {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"All" | "Created" | "Submitted">("All");
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [committedMap, setCommittedMap] = useState<Map<string, bigint>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const loadCommitted = async () => {
      try {
        const chainDecl = (deployedContracts as any)[chainId];
        const factoryDecl = chainDecl?.BountyFactory;
        const factoryAddress = factoryDecl?.address as `0x${string}` | undefined;
        if (!publicClient || !factoryAddress) return;
        const createdEvent = parseAbiItem(
          "event BountyCreated(address indexed bountyAddress, address indexed owner, string cid, uint256 amount, uint256 stakeAmount, uint256 duration)",
        );
        const logs = await publicClient.getLogs({ address: factoryAddress, event: createdEvent, fromBlock: 0n });
        const cmap = new Map<string, bigint>();
        for (const log of logs as any[]) {
          cmap.set(log.args?.bountyAddress as string, (log.args?.amount as bigint) ?? 0n);
        }
        if (!cancelled) setCommittedMap(cmap);
      } catch (e) {
        console.warn("Failed to load committed amounts", e);
      }
    };
    loadCommitted();
    return () => {
      cancelled = true;
    };
  }, [publicClient, chainId]);

  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

  // Phase 1: read owners/status/amount for all bounties
  const baseReads = useMemo(() => {
    return (deployedBounties || []).flatMap(addr => [
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "owner" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "status" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "amount" },
    ]);
  }, [deployedBounties]);

  const { data: baseData, isLoading: isLoadingBase } = useReadContracts({
    contracts: baseReads,
    query: { refetchInterval: 20000 },
  });

  // Map all bounties to owner/status/amount + list those owned by the connected user
  const bountyInfo = useMemo(() => {
    if (!baseData || !deployedBounties)
      return [] as { addr: `0x${string}`; owner: string; status: number; amount: bigint }[];
    const all: { addr: `0x${string}`; owner: string; status: number; amount: bigint }[] = [];
    for (let i = 0; i < baseData.length; i += 3) {
      const idx = i / 3;
      all.push({
        addr: deployedBounties[idx] as `0x${string}`,
        owner: (baseData[i]?.result || "0x0") as string,
        status: (baseData[i + 1]?.result || 0) as number,
        amount: (baseData[i + 2]?.result || 0n) as bigint,
      });
    }
    return all;
  }, [baseData, deployedBounties]);

  const ownedBounties: { addr: `0x${string}`; status: number; amount: bigint }[] = useMemo(() => {
    if (!connectedAddress) return [];
    return (bountyInfo as { addr: `0x${string}`; owner: string; status: number; amount: bigint }[])
      .filter(b => b.owner.toLowerCase() === connectedAddress.toLowerCase())
      .map(b => ({ addr: b.addr, status: b.status, amount: b.amount }));
  }, [bountyInfo, connectedAddress]);

  // Phase 2: for owned bounties, fetch submitters
  const { data: submittersData, isLoading: isLoadingSubmitters } = useReadContracts({
    contracts: ownedBounties.map(b => ({ address: b.addr, abi: bountyABI, functionName: "getSubmitters" })),
    query: { refetchInterval: 20000, enabled: ownedBounties.length > 0 },
  });

  // Build list of (bounty, submitter) pairs
  const pairs = useMemo(() => {
    const out: { bounty: `0x${string}`; submitter: `0x${string}` }[] = [];
    if (!submittersData) return out;
    submittersData.forEach((res, i) => {
      const b = ownedBounties[i];
      const subs = ((res?.result as string[]) || []) as `0x${string}`[];
      subs.forEach(s => out.push({ bounty: b.addr, submitter: s }));
    });
    return out;
  }, [submittersData, ownedBounties]);

  // Phase 3: fetch each submission tuple
  const { data: submissionTuples, isLoading: isLoadingSubs } = useReadContracts({
    contracts: pairs.map(p => ({
      address: p.bounty,
      abi: bountyABI,
      functionName: "getSubmission",
      args: [p.submitter],
    })),
    query: { refetchInterval: 20000, enabled: pairs.length > 0 },
  });

  const createdReports: ReportItem[] = useMemo(() => {
    if (!submissionTuples) return [];
    const out: ReportItem[] = [];
    submissionTuples.forEach((res, i) => {
      const tuple = res?.result as [string, bigint, number] | undefined;
      if (!tuple) return;
      const { bounty, submitter } = pairs[i];
      const owned = ownedBounties.find(b => b.addr === bounty);
      if (!owned) return;
      const reportCid = tuple[0];
      const stake = tuple[1];
      const subState = Number(tuple[2] || 0);
      if (!reportCid) return;
      out.push({
        bounty,
        owner: connectedAddress as string,
        researcher: submitter,
        reportCid,
        bountyStatus: owned.status,
        subState,
        amount: (committedMap.get(bounty) as bigint | undefined) ?? owned.amount,
        stake,
      });
    });
    return out;
  }, [submissionTuples, pairs, ownedBounties, connectedAddress, committedMap]);

  // Researcher's submissions across all bounties
  const { data: mySubmissionTuples, isLoading: isLoadingMySubs } = useReadContracts({
    contracts:
      connectedAddress && deployedBounties?.length
        ? (deployedBounties as `0x${string}`[]).map(addr => ({
            address: addr,
            abi: bountyABI,
            functionName: "getSubmission",
            args: [connectedAddress as `0x${string}`],
          }))
        : [],
    query: { refetchInterval: 20000, enabled: !!connectedAddress && (deployedBounties?.length || 0) > 0 },
  });

  const submittedReports: ReportItem[] = useMemo(() => {
    if (!mySubmissionTuples || !connectedAddress || !deployedBounties) return [];
    const out: ReportItem[] = [];
    const infoMap = new Map<string, { owner: string; status: number; amount: bigint }>();
    (bountyInfo as { addr: `0x${string}`; owner: string; status: number; amount: bigint }[]).forEach(b =>
      infoMap.set(b.addr, { owner: b.owner, status: b.status, amount: b.amount }),
    );
    mySubmissionTuples.forEach((res, i) => {
      const tuple = res?.result as [string, bigint, number] | undefined;
      if (!tuple) return;
      const bounty = deployedBounties[i] as `0x${string}`;
      const reportCid = tuple[0];
      if (!reportCid) return; // no submission by this user
      const stake = tuple[1];
      const subState = Number(tuple[2] || 0);
      const info = infoMap.get(bounty);
      if (!info) return;
      out.push({
        bounty,
        owner: info.owner,
        researcher: connectedAddress,
        reportCid,
        bountyStatus: info.status,
        subState,
        amount: (committedMap.get(bounty) as bigint | undefined) ?? info.amount,
        stake,
      });
    });
    return out;
  }, [mySubmissionTuples, connectedAddress, deployedBounties, bountyInfo, committedMap]);

  const allReports: ReportItem[] = useMemo(() => {
    const map = new Map<string, ReportItem>();
    createdReports.forEach(r => map.set(`${r.bounty}-${r.researcher}`.toLowerCase(), r));
    submittedReports.forEach(r => map.set(`${r.bounty}-${r.researcher}`.toLowerCase(), r));
    return Array.from(map.values());
  }, [createdReports, submittedReports]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "Created":
        return createdReports;
      case "Submitted":
        return submittedReports;
      case "All":
      default:
        return allReports;
    }
  }, [activeTab, createdReports, submittedReports, allReports]);

  const isLoading =
    isLoadingAddresses ||
    (isLoadingBase && (deployedBounties?.length || 0) > 0) ||
    (isLoadingSubmitters && ownedBounties.length > 0) ||
    (isLoadingSubs && pairs.length > 0) ||
    (isLoadingMySubs && (deployedBounties?.length || 0) > 0);

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
              activeTab === "All"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("All")}
          >
            All Reports
          </button>
          <button
            className={`px-4 py-2 font-roboto text-sm font-medium transition-all duration-300 ${
              activeTab === "Created"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Created")}
          >
            My Bounties
          </button>
          <button
            className={`px-4 py-2 font-roboto text-sm font-medium transition-all duration-300 ${
              activeTab === "Submitted"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Submitted")}
          >
            My Submissions
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
          <p className="text-gray-400 font-roboto">No reports found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div
              key={`${r.bounty}-${r.researcher}`}
              className="bg-gray-900 border border-gray-800 hover:border-[var(--color-secondary)]/50 p-6 transition-all duration-300 hover:scale-105"
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`px-3 py-1 text-xs font-roboto font-medium ${
                    r.subState === 1
                      ? "bg-purple-900/30 text-purple-400 border border-purple-700"
                      : r.subState === 2
                        ? "bg-green-900/30 text-green-400 border border-green-700"
                        : r.subState === 3
                          ? "bg-red-900/30 text-red-400 border border-red-700"
                          : r.subState === 4
                            ? "bg-gray-800 text-gray-400 border border-gray-700"
                            : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
                >
                  {SubmissionStatus[r.subState]}
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
                href={`/reports/${r.bounty}?researcher=${r.researcher}`}
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

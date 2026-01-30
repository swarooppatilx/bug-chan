"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther, parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContracts } from "wagmi";
import { BugAntIcon, InboxIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { SubmissionStatus, bountyABI } from "~~/contracts/BountyABI";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { formatEthShort } from "~~/utils/format";

type ReportItem = {
  bounty: `0x${string}`;
  owner: string;
  researcher: string;
  reportCid: string;
  bountyStatus: number;
  subState: number;
  amount: bigint;
  stake: bigint;
  visibility: number;
  severity: number;
};

// Consistent badge styles
const BADGE_BASE = "inline-flex items-center h-7 px-3 border text-xs font-roboto";
const BADGE_PURPLE = `${BADGE_BASE} bg-purple-900/30 border-purple-700 text-purple-400`;
const BADGE_GREEN = `${BADGE_BASE} bg-green-900/30 border-green-700 text-green-400`;
const BADGE_RED = `${BADGE_BASE} bg-red-900/30 border-red-700 text-red-400`;
const BADGE_GRAY = `${BADGE_BASE} bg-gray-800 border-gray-700 text-gray-400`;
const BADGE_PRIMARY = `${BADGE_BASE} bg-black border-[var(--color-secondary)]/30 text-[var(--color-secondary)]`;
const BADGE_YELLOW = `${BADGE_BASE} bg-yellow-900/30 border-yellow-700 text-yellow-400`;
const BADGE_ORANGE = `${BADGE_BASE} bg-orange-900/30 border-orange-700 text-orange-400`;

// Severity levels - must match contract enum
const SeverityLabels = ["None", "Low", "Medium", "High", "Critical"] as const;

const getSeverityBadgeClass = (severity: number) => {
  switch (severity) {
    case 1:
      return BADGE_GREEN; // Low
    case 2:
      return BADGE_YELLOW; // Medium
    case 3:
      return BADGE_ORANGE; // High
    case 4:
      return BADGE_RED; // Critical
    default:
      return BADGE_GRAY; // None
  }
};

export default function ReportsPage() {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"All" | "Created" | "Submitted" | "Triaged">("All");
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [committedMap, setCommittedMap] = useState<Map<string, bigint>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const loadCommitted = async () => {
      try {
        const chainDecl = (deployedContracts as any)[targetNetwork.id];
        const factoryDecl = chainDecl?.BountyFactory;
        const factoryAddress = factoryDecl?.address as `0x${string}` | undefined;
        if (!publicClient || !factoryAddress) return;
        const createdEvent = parseAbiItem(
          "event BountyCreated(address indexed bountyAddress, address indexed owner, string cid, uint256 amount, uint256 stakeAmount, uint256 duration)",
        );
        const fromBlockFactory: bigint | undefined =
          typeof factoryDecl?.deployedOnBlock === "number" && factoryDecl.deployedOnBlock > 0
            ? BigInt(factoryDecl.deployedOnBlock)
            : 0n;
        const logs = await publicClient.getLogs({
          address: factoryAddress,
          event: createdEvent,
          fromBlock: fromBlockFactory,
        });
        const cmap = new Map<string, bigint>();
        for (const log of logs as any[]) {
          const baddr = (log.args?.bountyAddress as string) || "";
          if (baddr) cmap.set(baddr.toLowerCase(), (log.args?.amount as bigint) ?? 0n);
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
  }, [publicClient, targetNetwork.id]);

  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

  // Phase 1: read owners/status/amount/triager for all bounties
  const baseReads = useMemo(() => {
    return (deployedBounties || []).flatMap(addr => [
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "owner" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "status" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "amount" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "triager" },
    ]);
  }, [deployedBounties]);

  const { data: baseData, isLoading: isLoadingBase } = useReadContracts({
    contracts: baseReads,
    query: { refetchInterval: 20000 },
  });

  // Map all bounties to owner/status/amount/triager + list those owned by the connected user
  const bountyInfo = useMemo(() => {
    if (!baseData || !deployedBounties)
      return [] as { addr: `0x${string}`; owner: string; status: number; amount: bigint; triager: string }[];
    const all: { addr: `0x${string}`; owner: string; status: number; amount: bigint; triager: string }[] = [];
    for (let i = 0; i < baseData.length; i += 4) {
      const idx = i / 4;
      all.push({
        addr: deployedBounties[idx] as `0x${string}`,
        owner: (baseData[i]?.result || "0x0") as string,
        status: (baseData[i + 1]?.result || 0) as number,
        amount: (baseData[i + 2]?.result || 0n) as bigint,
        triager: (baseData[i + 3]?.result || "0x0000000000000000000000000000000000000000") as string,
      });
    }
    return all;
  }, [baseData, deployedBounties]);

  const ownedBounties: { addr: `0x${string}`; status: number; amount: bigint }[] = useMemo(() => {
    if (!connectedAddress) return [];
    return (bountyInfo as { addr: `0x${string}`; owner: string; status: number; amount: bigint; triager: string }[])
      .filter(b => b.owner.toLowerCase() === connectedAddress.toLowerCase())
      .map(b => ({ addr: b.addr, status: b.status, amount: b.amount }));
  }, [bountyInfo, connectedAddress]);

  // Bounties where user is the triager (but not owner)
  const triagedBounties: { addr: `0x${string}`; owner: string; status: number; amount: bigint }[] = useMemo(() => {
    if (!connectedAddress) return [];
    return (bountyInfo as { addr: `0x${string}`; owner: string; status: number; amount: bigint; triager: string }[])
      .filter(
        b =>
          b.triager.toLowerCase() === connectedAddress.toLowerCase() &&
          b.triager !== "0x0000000000000000000000000000000000000000",
      )
      .map(b => ({ addr: b.addr, owner: b.owner, status: b.status, amount: b.amount }));
  }, [bountyInfo, connectedAddress]);

  // Phase 2: for owned bounties, fetch submitters
  const { data: submittersData, isLoading: isLoadingSubmitters } = useReadContracts({
    contracts: ownedBounties.map(b => ({ address: b.addr, abi: bountyABI, functionName: "getSubmitters" })),
    query: { refetchInterval: 20000, enabled: ownedBounties.length > 0 },
  });

  // Phase 2b: for triaged bounties, fetch submitters
  const { data: triagedSubmittersData, isLoading: isLoadingTriagedSubmitters } = useReadContracts({
    contracts: triagedBounties.map(b => ({ address: b.addr, abi: bountyABI, functionName: "getSubmitters" })),
    query: { refetchInterval: 20000, enabled: triagedBounties.length > 0 },
  });

  // Build list of (bounty, submitter) pairs for owned bounties
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

  // Build list of (bounty, submitter) pairs for triaged bounties
  const triagedPairs = useMemo(() => {
    const out: { bounty: `0x${string}`; submitter: `0x${string}`; owner: string }[] = [];
    if (!triagedSubmittersData) return out;
    triagedSubmittersData.forEach((res, i) => {
      const b = triagedBounties[i];
      const subs = ((res?.result as string[]) || []) as `0x${string}`[];
      subs.forEach(s => out.push({ bounty: b.addr, submitter: s, owner: b.owner }));
    });
    return out;
  }, [triagedSubmittersData, triagedBounties]);

  // Phase 3: fetch each submission tuple for owned bounties
  const { data: submissionTuples, isLoading: isLoadingSubs } = useReadContracts({
    contracts: pairs.map(p => ({
      address: p.bounty,
      abi: bountyABI,
      functionName: "getSubmission",
      args: [p.submitter],
    })),
    query: { refetchInterval: 20000, enabled: pairs.length > 0 },
  });

  // Phase 3b: fetch each submission tuple for triaged bounties
  const { data: triagedSubmissionTuples, isLoading: isLoadingTriagedSubs } = useReadContracts({
    contracts: triagedPairs.map(p => ({
      address: p.bounty,
      abi: bountyABI,
      functionName: "getSubmission",
      args: [p.submitter],
    })),
    query: { refetchInterval: 20000, enabled: triagedPairs.length > 0 },
  });

  const createdReports: ReportItem[] = useMemo(() => {
    if (!submissionTuples) return [];
    const out: ReportItem[] = [];
    submissionTuples.forEach((res, i) => {
      const tuple = res?.result as [string, bigint, number, number, number] | undefined;
      if (!tuple) return;
      const { bounty, submitter } = pairs[i];
      const owned = ownedBounties.find(b => b.addr === bounty);
      if (!owned) return;
      const reportCid = tuple[0];
      const stake = tuple[1];
      const subState = Number(tuple[2] || 0);
      const visibility = Number(tuple[3] || 0);
      const severity = Number(tuple[4] || 0);
      if (!reportCid) return;
      out.push({
        bounty,
        owner: connectedAddress as string,
        researcher: submitter,
        reportCid,
        bountyStatus: owned.status,
        subState,
        amount: (committedMap.get((bounty as string).toLowerCase()) as bigint | undefined) ?? owned.amount,
        stake,
        visibility,
        severity,
      });
    });
    return out;
  }, [submissionTuples, pairs, ownedBounties, connectedAddress, committedMap]);

  // Reports for bounties where user is the triager
  const triagedReports: ReportItem[] = useMemo(() => {
    if (!triagedSubmissionTuples) return [];
    const out: ReportItem[] = [];
    triagedSubmissionTuples.forEach((res, i) => {
      const tuple = res?.result as [string, bigint, number, number, number] | undefined;
      if (!tuple) return;
      const { bounty, submitter, owner } = triagedPairs[i];
      const triaged = triagedBounties.find(b => b.addr === bounty);
      if (!triaged) return;
      const reportCid = tuple[0];
      const stake = tuple[1];
      const subState = Number(tuple[2] || 0);
      const visibility = Number(tuple[3] || 0);
      const severity = Number(tuple[4] || 0);
      if (!reportCid) return;
      out.push({
        bounty,
        owner,
        researcher: submitter,
        reportCid,
        bountyStatus: triaged.status,
        subState,
        amount: (committedMap.get((bounty as string).toLowerCase()) as bigint | undefined) ?? triaged.amount,
        stake,
        visibility,
        severity,
      });
    });
    return out;
  }, [triagedSubmissionTuples, triagedPairs, triagedBounties, committedMap]);

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
      const tuple = res?.result as [string, bigint, number, number, number] | undefined;
      if (!tuple) return;
      const bounty = deployedBounties[i] as `0x${string}`;
      const reportCid = tuple[0];
      if (!reportCid) return; // no submission by this user
      const stake = tuple[1];
      const subState = Number(tuple[2] || 0);
      const visibility = Number(tuple[3] || 0);
      const severity = Number(tuple[4] || 0);
      const info = infoMap.get(bounty);
      if (!info) return;
      out.push({
        bounty,
        owner: info.owner,
        researcher: connectedAddress,
        reportCid,
        bountyStatus: info.status,
        subState,
        amount: (committedMap.get((bounty as string).toLowerCase()) as bigint | undefined) ?? info.amount,
        stake,
        visibility,
        severity,
      });
    });
    return out;
  }, [mySubmissionTuples, connectedAddress, deployedBounties, bountyInfo, committedMap]);

  const allReports: ReportItem[] = useMemo(() => {
    const map = new Map<string, ReportItem>();
    createdReports.forEach(r => map.set(`${r.bounty}-${r.researcher}`.toLowerCase(), r));
    triagedReports.forEach(r => map.set(`${r.bounty}-${r.researcher}`.toLowerCase(), r));
    submittedReports.forEach(r => map.set(`${r.bounty}-${r.researcher}`.toLowerCase(), r));
    return Array.from(map.values());
  }, [createdReports, triagedReports, submittedReports]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "Created":
        return createdReports;
      case "Triaged":
        return triagedReports;
      case "Submitted":
        return submittedReports;
      case "All":
      default:
        return allReports;
    }
  }, [activeTab, createdReports, triagedReports, submittedReports, allReports]);

  const isLoading =
    isLoadingAddresses ||
    (isLoadingBase && (deployedBounties?.length || 0) > 0) ||
    (isLoadingSubmitters && ownedBounties.length > 0) ||
    (isLoadingTriagedSubmitters && triagedBounties.length > 0) ||
    (isLoadingSubs && pairs.length > 0) ||
    (isLoadingTriagedSubs && triagedPairs.length > 0) ||
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
          <button
            className={`px-4 py-2 font-roboto text-sm font-medium transition-all duration-300 ${
              activeTab === "Triaged"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setActiveTab("Triaged")}
          >
            Triaging
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
          {filtered.map(r => {
            const fullEth = formatEther(r.amount);
            const shortEth = formatEthShort(r.amount, 6);
            const isTrimmed = (fullEth.split(".")[1]?.length || 0) > 6;

            return (
              <div
                key={`${r.bounty}-${r.researcher}`}
                className="bg-gray-900 border border-gray-800 hover:border-[var(--color-secondary)]/50 p-6 transition-all duration-300 hover:scale-105"
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={
                      r.subState === 1
                        ? BADGE_PURPLE
                        : r.subState === 2
                          ? BADGE_GREEN
                          : r.subState === 3
                            ? BADGE_RED
                            : BADGE_GRAY
                    }
                  >
                    {SubmissionStatus[r.subState]}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={BADGE_PRIMARY + " whitespace-nowrap"} title={`${fullEth} ETH`}>
                      <span className="relative inline-flex items-center gap-1 group">
                        {shortEth} ETH
                        {isTrimmed && (
                          <>
                            <span className="text-gray-400 align-top text-[10px]">≈</span>
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-gray-700 text-white text-xs font-roboto whitespace-nowrap opacity-0 group-hover:opacity-100">
                              {fullEth} ETH
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    <span className={r.visibility === 1 ? BADGE_GREEN : BADGE_GRAY}>
                      {r.visibility === 1 ? "Public" : "Private"}
                    </span>
                    {r.severity > 0 && (
                      <span className={getSeverityBadgeClass(r.severity)}>
                        {SeverityLabels[r.severity]}
                      </span>
                    )}
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}

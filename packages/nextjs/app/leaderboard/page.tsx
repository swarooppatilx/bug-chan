"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContracts } from "wagmi";
import { ChartBarIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { bountyABI } from "~~/contracts/BountyABI";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type ResearcherRow = {
  researcher: `0x${string}`;
  submissions: number;
  rewardsWon: bigint; // wei
};

type OrgRow = {
  org: `0x${string}`;
  totalBounties: number;
  totalRewardsPaid: bigint; // wei
  totalCommitted: bigint; // wei
};

export default function LeaderboardPage() {
  const { address: connectedAddress } = useAccount();
  const [tab, setTab] = useState<"researchers" | "orgs">("researchers");
  const PAGE_SIZE = 10;
  const [pageResearchers, setPageResearchers] = useState(1);
  const [pageOrgs, setPageOrgs] = useState(1);
  // Debug flag (enable with localStorage.DEBUG_LEADERBOARD = "1" or NEXT_PUBLIC_DEBUG_LEADERBOARD=1)
  const debugEnabled = true;
  const dlog = useCallback(
    (...args: any[]) => {
      if (debugEnabled) console.debug("[Leaderboard]", ...args);
    },
    [debugEnabled],
  );

  // Reset pagination when switching tabs
  useEffect(() => {
    if (tab === "researchers") setPageResearchers(1);
    else setPageOrgs(1);
  }, [tab]);

  const formatEthPrecise = (wei: bigint, fractionDigits = 8) => {
    const s = formatEther(wei);
    const [intPart, fracRaw = ""] = s.split(".");
    const frac = (fracRaw + "000000000000000000").slice(0, fractionDigits);
    return `${intPart}.${frac}`;
  };

  // Load all deployed bounties
  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

  // Read status and amount for all bounties
  const statusAmountReads = useMemo(() => {
    return (deployedBounties || []).flatMap(addr => [
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "status" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "amount" },
      { address: addr as `0x${string}`, abi: bountyABI, functionName: "owner" },
    ]);
  }, [deployedBounties]);

  const { data: statusAmountData, isLoading: isLoadingStatusAmount } = useReadContracts({
    contracts: statusAmountReads,
    query: { refetchInterval: 30000 },
  });

  // Get submitters per bounty
  const { data: submittersData, isLoading: isLoadingSubmitters } = useReadContracts({
    contracts: (deployedBounties || []).map(addr => ({
      address: addr as `0x${string}`,
      abi: bountyABI,
      functionName: "getSubmitters",
    })),
    query: { refetchInterval: 30000, enabled: (deployedBounties?.length || 0) > 0 },
  });

  // Build (bounty, submitter) pairs
  const pairs = useMemo(() => {
    const out: { bounty: `0x${string}`; submitter: `0x${string}` }[] = [];
    if (!submittersData || !deployedBounties) return out;
    submittersData.forEach((res, i) => {
      const addr = deployedBounties[i] as `0x${string}`;
      const subs = ((res?.result as string[]) || []) as `0x${string}`[];
      subs.forEach(s => out.push({ bounty: addr, submitter: s }));
    });
    return out;
  }, [submittersData, deployedBounties]);

  // Fetch submission details for each pair
  const { data: subsTuples, isLoading: isLoadingSubs } = useReadContracts({
    contracts: pairs.map(p => ({
      address: p.bounty,
      abi: bountyABI,
      functionName: "getSubmission",
      args: [p.submitter],
    })),
    query: { refetchInterval: 30000, enabled: pairs.length > 0 },
  });

  // Historical logs: BountyCreated (factory) and BountyClosed (per bounty)
  // Always use the app's target network for event queries to keep it consistent with useScaffoldReadContract
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [createdMap, setCreatedMap] = useState<
    Map<string, { owner: `0x${string}`; amount: bigint; stakeAmount?: bigint; duration?: bigint }>
  >(new Map());
  const [closedMap, setClosedMap] = useState<Map<string, { winners: bigint; totalPaid: bigint }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const loadLogs = async () => {
      try {
        const chainDecl = (deployedContracts as any)[targetNetwork.id];
        const factoryDecl = chainDecl?.BountyFactory;
        const factoryAddress = factoryDecl?.address as `0x${string}` | undefined;
        const factoryAbi = factoryDecl?.abi;
        if (!publicClient || !factoryAddress || !factoryAbi) return;

        // BountyCreated logs from factory (initial amounts and owners)
        const createdEvent = parseAbiItem(
          "event BountyCreated(address indexed bountyAddress, address indexed owner, string cid, uint256 amount, uint256 stakeAmount, uint256 duration)",
        );
        const fromBlockFactory: bigint | undefined =
          typeof factoryDecl?.deployedOnBlock === "number" && factoryDecl.deployedOnBlock > 0
            ? BigInt(factoryDecl.deployedOnBlock)
            : 0n;
        const createdLogs = await publicClient.getLogs({
          address: factoryAddress,
          event: createdEvent,
          fromBlock: fromBlockFactory,
        });
        dlog("BountyCreated logs:", createdLogs.length, {
          fromBlock: fromBlockFactory?.toString?.(),
          factory: factoryAddress,
          sampleArgs: (createdLogs as any[])?.[0]?.args,
        });
        const cMap = new Map<
          string,
          { owner: `0x${string}`; amount: bigint; stakeAmount?: bigint; duration?: bigint }
        >();
        for (const log of createdLogs as any[]) {
          const bountyAddr = (log.args?.bountyAddress as `0x${string}`) || undefined;
          const owner = (log.args?.owner as `0x${string}`) || "0x0000000000000000000000000000000000000000";
          const amount = (log.args?.amount as bigint) ?? 0n;
          const stakeAmount = log.args?.stakeAmount as bigint | undefined;
          const duration = log.args?.duration as bigint | undefined;
          if (bountyAddr)
            cMap.set(bountyAddr.toLowerCase(), {
              owner: owner.toLowerCase() as `0x${string}`,
              amount,
              stakeAmount,
              duration,
            });
        }
        dlog("createdMap size:", cMap.size, "sample:", Array.from(cMap.entries())[0]);

        // BountyClosed logs per bounty (totalPaid and winners)
        const bounties = (deployedBounties || []) as `0x${string}`[];
        const closedEvent = parseAbiItem("event BountyClosed(uint256 winners, uint256 totalPaid)");
        const closedEntries = await Promise.all(
          bounties.map(async addr => {
            try {
              const logs = await publicClient.getLogs({
                address: addr as `0x${string}`,
                event: closedEvent,
                fromBlock: fromBlockFactory,
              });
              const last = (logs as any[]).at(-1);
              if (!last) return undefined;
              return [
                (addr as string).toLowerCase(),
                { winners: (last.args?.winners as bigint) ?? 0n, totalPaid: (last.args?.totalPaid as bigint) ?? 0n },
              ] as const;
            } catch {
              return undefined;
            }
          }),
        );
        const clMap = new Map<string, { winners: bigint; totalPaid: bigint }>();
        for (const entry of closedEntries) if (entry) clMap.set(entry[0], entry[1]);
        dlog("closedMap size:", clMap.size, "sample:", Array.from(clMap.entries())[0]);

        if (!cancelled) {
          setCreatedMap(cMap);
          setClosedMap(clMap);
        }
      } catch (e) {
        console.warn("Failed to load leaderboard logs", e);
      }
    };

    loadLogs();
    const id = setInterval(loadLogs, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicClient, targetNetwork.id, deployedBounties, dlog]);

  // Aggregate leaderboards from on-chain snapshot
  const { researcherRows, orgRows } = useMemo(() => {
    if (!deployedBounties?.length || !statusAmountData)
      return {
        researcherRows: [] as ResearcherRow[],
        orgRows: [] as OrgRow[],
      };

    // Build a lookup of bounty -> { status, amountCommittedOrLive, owner }
    const bountyInfo = new Map<string, { status: number; amount: bigint; owner: `0x${string}` }>();
    for (let i = 0; i < statusAmountData.length; i += 3) {
      const idx = i / 3;
      const st = (statusAmountData[i]?.result as number | undefined) ?? 0;
      const bountyAddr = deployedBounties[idx] as `0x${string}`;
      const bountyAddrKey = (bountyAddr as string).toLowerCase();
      const committed = createdMap.get(bountyAddrKey)?.amount ?? 0n;
      const liveAmt = (statusAmountData[i + 1]?.result as bigint | undefined) ?? 0n;
      const amt = committed > 0n ? committed : liveAmt;
      const ownerFromEvent = createdMap.get(bountyAddrKey)?.owner;
      const ownerLive = statusAmountData[i + 2]?.result as string | undefined;
      const ownerAddr = (
        (ownerFromEvent || ownerLive || "0x0000000000000000000000000000000000000000") as string
      ).toLowerCase() as `0x${string}`;
      bountyInfo.set(bountyAddrKey, {
        status: st,
        amount: amt,
        owner: ownerAddr,
      });
    }

    // Researchers: totals and submission counts
    const rewardsTotals = new Map<string, bigint>();
    const submissionCounts = new Map<string, number>();
    const winnersNow = new Map<string, number>();
    const acceptedByBounty = new Map<string, Set<string>>();
    subsTuples?.forEach((res, i) => {
      const tuple = res?.result as [string, bigint, number] | undefined;
      if (!tuple) return;
      const { bounty, submitter } = pairs[i];
      const bKey = (bounty as string).toLowerCase();
      const info = bountyInfo.get(bKey);
      if (!info) return;
      const [cid, , state] = tuple; // state: 1 Pending, 2 Accepted, 3 Rejected, 4 Refunded
      if (!cid) return;

      // Count every submission from this researcher
      const submitterKey = (submitter as string).toLowerCase();
      submissionCounts.set(submitterKey, (submissionCounts.get(submitterKey) || 0) + 1);

      // Track accepted per bounty to compute shares
      if (state === 2) {
        winnersNow.set(bKey, (winnersNow.get(bKey) || 0) + 1);
        if (!acceptedByBounty.has(bKey)) acceptedByBounty.set(bKey, new Set<string>());
        acceptedByBounty.get(bKey)!.add((submitter as string).toLowerCase());
      }
    });

    // Compute rewards per researcher using closed totals when available; otherwise projected using live committed amount
    for (const [bountyAddr, acceptedSet] of acceptedByBounty.entries()) {
      const info = bountyInfo.get(bountyAddr);
      if (!info) continue;
      const closed = closedMap.get(bountyAddr);
      if (closed && closed.winners > 0n) {
        const share = closed.totalPaid / closed.winners;
        for (const researcher of acceptedSet.values()) {
          rewardsTotals.set(researcher, (rewardsTotals.get(researcher) || 0n) + share);
        }
      } else {
        const wn = winnersNow.get(bountyAddr) || 0;
        if (wn > 0 && info.amount > 0n) {
          const share = info.amount / BigInt(wn);
          for (const researcher of acceptedSet.values()) {
            rewardsTotals.set(researcher, (rewardsTotals.get(researcher) || 0n) + share);
          }
        }
      }
    }

    const allResearchers = new Set<string>([
      ...Array.from(submissionCounts.keys()),
      ...Array.from(rewardsTotals.keys()),
    ]);

    const researcherRows: ResearcherRow[] = Array.from(allResearchers.values())
      .map(researcher => ({
        researcher: (researcher as string).toLowerCase() as `0x${string}`,
        rewardsWon: rewardsTotals.get(researcher) || 0n,
        submissions: submissionCounts.get(researcher) || 0,
      }))
      .sort((a, b) =>
        a.rewardsWon === b.rewardsWon
          ? a.submissions === b.submissions
            ? 0
            : a.submissions < b.submissions
              ? 1
              : -1
          : a.rewardsWon < b.rewardsWon
            ? 1
            : -1,
      )
      .slice(0, 100);

    // Orgs: totals from events to be robust after close
    const orgBounties = new Map<string, number>();
    const orgCommitted = new Map<string, bigint>();
    const orgPaid = new Map<string, bigint>();
    createdMap.forEach((c, addr) => {
      const owner = (c.owner as string).toLowerCase();
      const addrKey = (addr as string).toLowerCase();
      orgBounties.set(owner, (orgBounties.get(owner) || 0) + 1);
      orgCommitted.set(owner, (orgCommitted.get(owner) || 0n) + (c.amount || 0n));
      const closed = closedMap.get(addrKey);
      if (closed) orgPaid.set(owner, (orgPaid.get(owner) || 0n) + (closed.totalPaid || 0n));
    });

    const orgRows: OrgRow[] = Array.from(orgBounties.entries())
      .map(([org, totalBounties]) => ({
        org: org as `0x${string}`,
        totalBounties,
        totalRewardsPaid: orgPaid.get(org) || 0n,
        totalCommitted: orgCommitted.get(org) || 0n,
      }))
      .sort((a, b) =>
        a.totalRewardsPaid === b.totalRewardsPaid
          ? (a as any).totalCommitted === (b as any).totalCommitted
            ? a.totalBounties === b.totalBounties
              ? 0
              : a.totalBounties < b.totalBounties
                ? 1
                : -1
            : (a as any).totalCommitted < (b as any).totalCommitted
              ? 1
              : -1
          : a.totalRewardsPaid < b.totalRewardsPaid
            ? 1
            : -1,
      )
      .slice(0, 100);

    dlog("researcherRows:", researcherRows.length, "orgRows:", orgRows.length, {
      sampleResearcher: researcherRows[0],
      sampleOrg: orgRows[0],
    });
    return { researcherRows, orgRows };
  }, [deployedBounties, statusAmountData, subsTuples, pairs, createdMap, closedMap, dlog]);

  // Show all entries (before/after close), even if rewards are 0
  const filteredResearchers = useMemo(() => researcherRows || [], [researcherRows]);
  const filteredOrgs = useMemo(() => orgRows || [], [orgRows]);

  const totalResearcherPages = Math.max(1, Math.ceil(filteredResearchers.length / PAGE_SIZE));
  const totalOrgPages = Math.max(1, Math.ceil(filteredOrgs.length / PAGE_SIZE));

  const currentResearcherPage = Math.min(pageResearchers, totalResearcherPages);
  const currentOrgPage = Math.min(pageOrgs, totalOrgPages);

  const startResearcher = (currentResearcherPage - 1) * PAGE_SIZE;
  const startOrg = (currentOrgPage - 1) * PAGE_SIZE;

  const pageResearchersRows = filteredResearchers.slice(startResearcher, startResearcher + PAGE_SIZE);
  const pageOrgRows = filteredOrgs.slice(startOrg, startOrg + PAGE_SIZE);

  const isLoading =
    isLoadingAddresses ||
    (isLoadingStatusAmount && (deployedBounties?.length || 0) > 0) ||
    (isLoadingSubmitters && (deployedBounties?.length || 0) > 0) ||
    (isLoadingSubs && pairs.length > 0);

  const youRank = useMemo(() => {
    if (!connectedAddress) return undefined;
    if (tab !== "researchers") return undefined;
    const idx = (filteredResearchers || []).findIndex(
      (r: ResearcherRow) => r.researcher.toLowerCase() === connectedAddress.toLowerCase(),
    );
    return idx >= 0 ? idx + 1 : undefined;
  }, [filteredResearchers, connectedAddress, tab]);

  return (
    <section className="relative">
      {/* Themed background overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-100"
        style={{
          backgroundImage: `
            radial-gradient(700px circle at 0% 0%, rgba(219,255,119,0.10), transparent 60%),
            radial-gradient(800px circle at 100% 0%, rgba(155,135,245,0.12), transparent 60%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 40px)
          `,
          backgroundColor: "#000000",
        }}
      />
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-akira text-white flex items-center gap-3">
            <TrophyIcon className="h-8 w-8 text-[var(--color-secondary)]" />
            Leaderboard
          </h1>

          {youRank !== undefined && (
            <div className="px-4 py-2 bg-black/70 border border-[var(--color-secondary)]/50 text-white font-roboto text-sm flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-[var(--color-secondary)]" />
              <span>Your rank:</span>
              <span className="text-[var(--color-secondary)] font-medium">#{youRank}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            className={`px-4 py-2 border ${tab === "researchers" ? "bg-[var(--color-secondary)] text-black border-[var(--color-secondary)]" : "bg-black/60 text-white border-[var(--color-secondary)]/40"}`}
            onClick={() => setTab("researchers")}
          >
            Researchers
          </button>
          <button
            className={`px-4 py-2 border ${tab === "orgs" ? "bg-[var(--color-secondary)] text-black border-[var(--color-secondary)]" : "bg-black/60 text-white border-[var(--color-secondary)]/40"}`}
            onClick={() => setTab("orgs")}
          >
            Organisations
          </button>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="h-12 w-12  border-4 border-[var(--color-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-roboto">Crunching on-chain stats...</p>
          </div>
        ) : tab === "researchers" && (filteredResearchers?.length || 0) === 0 ? (
          <div className="text-center py-16 bg-secondary/20 border border-[var(--color-secondary)] p-12">
            <TrophyIcon className="h-16 w-16 text-secondary mx-auto mb-4" />
            <p className="text-white font-roboto">No rewarded submissions yet. Get approved to appear on the board.</p>
          </div>
        ) : tab === "orgs" && (filteredOrgs?.length || 0) === 0 ? (
          <div className="text-center py-16 bg-secondary/20 border border-[var(--color-secondary)] p-12">
            <TrophyIcon className="h-16 w-16 text-secondary mx-auto mb-4" />
            <p className="text-white font-roboto">No rewards paid yet. Approve a bounty to appear here.</p>
          </div>
        ) : tab === "researchers" ? (
          // Researchers Table
          <div className="overflow-x-auto bg-black/70 border border-[var(--color-secondary)]/30 flex flex-col min-h-[420px]">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-secondary text-xs font-roboto uppercase tracking-wider border-b border-[var(--color-secondary)]/20">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Researcher</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Rewards</th>
                </tr>
              </thead>
              <tbody>
                {pageResearchersRows.map((r: ResearcherRow, idx: number) => (
                  <tr
                    key={r.researcher}
                    className="border-b border-[var(--color-secondary)]/10 hover:bg-[var(--color-secondary)]/5 transition-colors"
                  >
                    <td className="px-4 py-4 text-white font-roboto">{startResearcher + idx + 1}</td>
                    <td className="px-4 py-4">
                      <Address address={r.researcher} format="short" />
                    </td>
                    <td className="px-4 py-4 text-white font-roboto">{r.submissions}</td>
                    <td className="px-4 py-4 font-roboto">
                      <span className="text-[var(--color-secondary)] font-medium">
                        {formatEthPrecise(r.rewardsWon, 8)} ETH
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            {totalResearcherPages > 1 && (
              <div className="mt-auto flex items-center justify-between p-4 text-white font-roboto">
                <button
                  className="px-3 py-1 border border-[var(--color-secondary)]/50 disabled:opacity-50"
                  disabled={currentResearcherPage <= 1}
                  onClick={() => setPageResearchers(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {currentResearcherPage} of {totalResearcherPages}
                </span>
                <button
                  className="px-3 py-1 border border-[var(--color-secondary)]/50 disabled:opacity-50"
                  disabled={currentResearcherPage >= totalResearcherPages}
                  onClick={() => setPageResearchers(p => Math.min(totalResearcherPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          // Organisations Table
          <div className="overflow-x-auto bg-black/70 border border-[var(--color-secondary)]/30 flex flex-col min-h-[420px]">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-secondary text-xs font-roboto uppercase tracking-wider border-b border-[var(--color-secondary)]/20">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Total Bounties</th>
                  <th className="px-4 py-3">Total Committed</th>
                  <th className="px-4 py-3">Total Rewards Paid</th>
                </tr>
              </thead>
              <tbody>
                {pageOrgRows.map((r: OrgRow, idx: number) => (
                  <tr
                    key={`${r.org}-${idx}`}
                    className="border-b border-[var(--color-secondary)]/10 hover:bg-[var(--color-secondary)]/5 transition-colors"
                  >
                    <td className="px-4 py-4 text-white font-roboto">{startOrg + idx + 1}</td>
                    <td className="px-4 py-4">
                      <Address address={r.org} format="short" />
                    </td>
                    <td className="px-4 py-4 text-white font-roboto">{r.totalBounties}</td>
                    <td className="px-4 py-4 font-roboto">
                      <span className="text-[var(--color-secondary)] font-medium">
                        {formatEthPrecise((r as any).totalCommitted as bigint, 8)} ETH
                      </span>
                    </td>
                    <td className="px-4 py-4 font-roboto">
                      <span className="text-[var(--color-secondary)] font-medium">
                        {formatEthPrecise(r.totalRewardsPaid, 8)} ETH
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            {totalOrgPages > 1 && (
              <div className="mt-auto flex items-center justify-between p-4 text-white font-roboto">
                <button
                  className="px-3 py-1 border border-[var(--color-secondary)]/50 disabled:opacity-50"
                  disabled={currentOrgPage <= 1}
                  onClick={() => setPageOrgs(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {currentOrgPage} of {totalOrgPages}
                </span>
                <button
                  className="px-3 py-1 border border-[var(--color-secondary)]/50 disabled:opacity-50"
                  disabled={currentOrgPage >= totalOrgPages}
                  onClick={() => setPageOrgs(p => Math.min(totalOrgPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

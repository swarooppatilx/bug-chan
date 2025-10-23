"use client";

import { useMemo } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { ChartBarIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type LeaderboardRow = {
  researcher: `0x${string}`;
  submissions: number;
  approved: number;
  rejected: number;
  rewardsWon: bigint; // wei
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function LeaderboardPage() {
  const { address: connectedAddress } = useAccount();

  // Load all deployed bounties
  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

  // For each bounty, read: researcher, status, amount
  const contractsToRead = useMemo(() => {
    return (deployedBounties || []).flatMap(addr => [
      {
        address: addr as `0x${string}`,
        abi: bountyABI,
        functionName: "researcher",
      },
      {
        address: addr as `0x${string}`,
        abi: bountyABI,
        functionName: "status",
      },
      {
        address: addr as `0x${string}`,
        abi: bountyABI,
        functionName: "amount",
      },
    ]);
  }, [deployedBounties]);

  const { data: onchain, isLoading: isLoadingData } = useReadContracts({
    contracts: contractsToRead,
    query: { refetchInterval: 30000 },
  });

  // Aggregate leaderboard from on-chain snapshot
  const rows: LeaderboardRow[] = useMemo(() => {
    if (!onchain || !deployedBounties?.length) return [];

    const map = new Map<string, LeaderboardRow>();
    for (let i = 0; i < onchain.length; i += 3) {
      const researcher = (onchain[i]?.result as string | undefined) || ZERO_ADDRESS;
      const statusIdx = (onchain[i + 1]?.result as number | undefined) ?? 0;
      const amount = (onchain[i + 2]?.result as bigint | undefined) ?? 0n;

      if (!researcher || researcher === ZERO_ADDRESS) continue;

      const statusLabel = BountyStatus?.[statusIdx] ?? "Open";
      const existing = map.get(researcher) || {
        researcher: researcher as `0x${string}`,
        submissions: 0,
        approved: 0,
        rejected: 0,
        rewardsWon: 0n,
      };

      // Count if there's a submission tied to a researcher
      if (statusLabel === "Submitted" || statusLabel === "Approved" || statusLabel === "Rejected") {
        existing.submissions += 1;
      }
      if (statusLabel === "Approved") {
        existing.approved += 1;
        existing.rewardsWon += amount;
      }
      if (statusLabel === "Rejected") {
        existing.rejected += 1;
      }

      map.set(researcher, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => {
        // Sort by total rewards desc, then approvals desc, then submissions desc
        if (a.rewardsWon !== b.rewardsWon) {
          return Number(b.rewardsWon - a.rewardsWon);
        }
        if (a.approved !== b.approved) return b.approved - a.approved;
        return b.submissions - a.submissions;
      })
      .slice(0, 100); // cap for UI
  }, [onchain, deployedBounties]);

  const isLoading = isLoadingAddresses || (isLoadingData && rows.length === 0);

  const youRank = useMemo(() => {
    if (!connectedAddress) return undefined;
    const idx = rows.findIndex(r => r.researcher.toLowerCase() === connectedAddress.toLowerCase());
    return idx >= 0 ? idx + 1 : undefined;
  }, [rows, connectedAddress]);

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

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="h-12 w-12  border-4 border-[var(--color-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-roboto">Crunching on-chain stats...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-secondary/20 border border-[var(--color-secondary)] p-12">
            <TrophyIcon className="h-16 w-16 text-secondary mx-auto mb-4" />
            <p className="text-white font-roboto">No submissions yet. Be the first to report and climb the board.</p>
          </div>
        ) : (
          // Table
          <div className="overflow-x-auto bg-black/70 border border-[var(--color-secondary)]/30">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-secondary text-xs font-roboto uppercase tracking-wider border-b border-[var(--color-secondary)]/20">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Researcher</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Rejected</th>
                  <th className="px-4 py-3">Rewards</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.researcher}
                    className="border-b border-[var(--color-secondary)]/10 hover:bg-[var(--color-secondary)]/5 transition-colors"
                  >
                    <td className="px-4 py-4 text-white font-roboto">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <Address address={r.researcher} format="short" />
                    </td>
                    <td className="px-4 py-4 text-white font-roboto">{r.submissions}</td>
                    <td className="px-4 py-4 text-white font-roboto">{r.approved}</td>
                    <td className="px-4 py-4 text-white font-roboto">{r.rejected}</td>
                    <td className="px-4 py-4 font-roboto">
                      <span className="text-[var(--color-secondary)] font-medium">{formatEther(r.rewardsWon)} ETH</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

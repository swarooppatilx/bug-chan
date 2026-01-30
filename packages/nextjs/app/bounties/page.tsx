"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatEther, parseAbiItem } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useReadContracts } from "wagmi";
import { BugAntIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { formatEthShort } from "~~/utils/format";

type BountyCardProps = {
  id: string;
  owner: string;
  amount: bigint;
  status: number;
  cid: string;
  submissionCount: number;
  hasSubmitted: boolean;
  connectedAddress?: string | undefined;
};

const BountyCard = ({
  id,
  owner,
  amount,
  status,
  cid,
  submissionCount,
  hasSubmitted,
  connectedAddress,
}: BountyCardProps) => {
  const [metadata, setMetadata] = useState({
    title: "Loading bounty details...",
    description: "...",
    severity: "Medium",
  });
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!cid) {
        setMetadata({
          title: `Bounty: ${id.substring(0, 8)}...`,
          description: "No metadata found.",
          severity: "Medium",
        });
        setIsMetadataLoading(false);
        return;
      }

      try {
        const lighthouseGatewayUrl = `https://gateway.lighthouse.storage/ipfs/${cid}`;
        const response = await fetch(lighthouseGatewayUrl);
        if (!response.ok) throw new Error("Failed to fetch from IPFS");
        const data = await response.json();
        setMetadata({
          title: data.title || `Bounty: ${id.substring(0, 8)}...`,
          description: data.description || "No description available.",
          severity: data.severity || "Medium",
        });
      } catch (error) {
        console.error("Failed to fetch bounty metadata:", error);
        setMetadata(prev => ({ ...prev, description: "Could not load description from IPFS." }));
      } finally {
        setIsMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, [cid, id]);

  // Short vs full formatting for reward
  const fullEth = formatEther(amount);
  const shortEth = formatEthShort(amount, 6);
  const isTrimmed = (fullEth.split(".")[1]?.length || 0) > 6;

  return (
    <div
      className={`bg-gray-900 border border-gray-800 hover:border-[var(--color-secondary)]/50 p-6 transition-all duration-300 hover:scale-105 ${isMetadataLoading ? "animate-pulse" : ""}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-row gap-4">
          {" "}
          <div className={`px-3 py-1 text-xs font-roboto font-medium ${getSeverityColor(metadata.severity)}`}>
            {metadata.severity}
          </div>
          {hasSubmitted && connectedAddress && (
            <Link
              href={`/reports/${id}?researcher=${connectedAddress}`}
              className="px-2 py-1 bg-secondary/30 text-secondary border border-secondary text-xs font-roboto hover:bg-secondary/50"
            >
              Submitted
            </Link>
          )}
        </div>

        <div className={`px-3 py-1 text-xs font-roboto font-medium ${getStatusColor(BountyStatus[status])}`}>
          {BountyStatus[status]}
        </div>
      </div>
      <h2 className="text-xl font-akira mb-3 text-white truncate">{metadata.title}</h2>
      <div className="markdown-content max-h-14 overflow-hidden">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{metadata.description}</ReactMarkdown>
      </div>
      <div className="flex justify-between items-center text-sm mb-4 pt-4 border-t border-gray-800">
        <div>
          <p className="text-gray-500 font-roboto text-xs mb-1">Reward</p>
          <p className="font-roboto font-medium text-lg text-[var(--color-secondary)] whitespace-nowrap">
            <span className="relative inline-flex items-center gap-1 group" title={`${fullEth} ETH`}>
              {shortEth} ETH
              {isTrimmed && (
                <>
                  <span className="text-gray-400 align-top text-xs">≈</span>
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black border border-gray-700 text-white text-xs font-roboto whitespace-nowrap opacity-0 group-hover:opacity-100">
                    {fullEth} ETH
                  </span>
                </>
              )}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 font-roboto text-xs mb-1">Posted by</p>
          <Address address={owner} format="short" />
        </div>
      </div>
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="text-gray-400 font-roboto">
          Submissions: <span className="text-white font-medium">{submissionCount}</span>
        </div>
      </div>
      <Link
        href={`/bounties/${id}`}
        className="block w-full text-center px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white font-roboto text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95"
      >
        View Details
      </Link>
    </div>
  );
};

export default function BountiesPage() {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [committedMap, setCommittedMap] = useState<Map<string, bigint>>(new Map());

  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

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
        if (!cancelled) {
          setCommittedMap(cmap);
        }
      } catch (e) {
        console.warn("Failed to load committed amounts", e);
      }
    };
    loadCommitted();
    return () => {
      cancelled = true;
    };
  }, [publicClient, targetNetwork.id]);

  const bountyContractsToRead = useMemo(() => {
    return (deployedBounties || []).flatMap(address => [
      { address, abi: bountyABI, functionName: "owner" },
      { address, abi: bountyABI, functionName: "amount" },
      { address, abi: bountyABI, functionName: "status" },
      { address, abi: bountyABI, functionName: "cid" },
      { address, abi: bountyABI, functionName: "getSubmitters" },
    ]);
  }, [deployedBounties]);

  const { data: bountiesOnChainData, isLoading: isLoadingBountiesData } = useReadContracts({
    contracts: bountyContractsToRead,
    query: {
      refetchInterval: 30000,
    },
  });

  const bounties = useMemo(() => {
    if (!bountiesOnChainData || !deployedBounties) return [];

    const processedBounties: Array<{
      id: string;
      owner: string;
      amount: bigint;
      status: number;
      cid: string;
      submissionCount: number;
      hasSubmitted: boolean;
    }> = [];
    for (let i = 0; i < bountiesOnChainData.length; i += 5) {
      const bountyIndex = i / 5;
      const submitters = (bountiesOnChainData[i + 4]?.result as string[]) || [];
      const hasSubmitted = !!(
        connectedAddress && submitters.some(s => s.toLowerCase() === connectedAddress.toLowerCase())
      );
      processedBounties.push({
        id: deployedBounties[bountyIndex] as string,
        owner: bountiesOnChainData[i]?.result as string,
        amount:
          (committedMap.get(((deployedBounties[bountyIndex] as string) || "").toLowerCase()) as bigint | undefined) ??
          ((bountiesOnChainData[i + 1]?.result as bigint) || 0n),
        status: bountiesOnChainData[i + 2]?.result as number,
        cid: bountiesOnChainData[i + 3]?.result as string,
        submissionCount: submitters.length,
        hasSubmitted,
      });
    }
    return processedBounties.sort((a, b) => a.status - b.status);
  }, [bountiesOnChainData, deployedBounties, connectedAddress, committedMap]);

  const isLoading = isLoadingAddresses || (isLoadingBountiesData && bounties.length === 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-akira flex items-center gap-3 text-white">
          <BugAntIcon className="h-8 w-8 text-[var(--color-secondary)]" />
          Open Bounties
        </h1>
        <Link
          href="/bounties/create"
          className="px-6 py-3 bg-[var(--color-secondary)] hover:opacity-90 text-black font-roboto font-medium transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Bounty
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="h-12 w-12 border-4 border-[var(--color-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-roboto">Loading bounties from the blockchain...</p>
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 p-12">
          <BugAntIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="mb-4 text-lg font-roboto text-gray-300">No bounties found.</p>
          {connectedAddress ? (
            <p className="font-roboto text-gray-400">
              Be the first to{" "}
              <Link href="/bounties/create" className="text-[var(--color-secondary)] hover:underline">
                create a bounty
              </Link>
              !
            </p>
          ) : (
            <p className="font-roboto text-gray-400">Please connect your wallet to view or create bounties.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bounties.map(bounty => (
            <BountyCard
              key={bounty.id}
              id={bounty.id}
              owner={bounty.owner}
              amount={bounty.amount}
              status={bounty.status}
              cid={bounty.cid}
              submissionCount={bounty.submissionCount}
              hasSubmitted={bounty.hasSubmitted}
              connectedAddress={connectedAddress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Low":
      return "bg-green-900/30 text-green-400 border border-green-700";
    case "Medium":
      return "bg-yellow-900/30 text-yellow-400 border border-yellow-700";
    case "High":
      return "bg-orange-900/30 text-orange-400 border border-orange-700";
    case "Critical":
      return "bg-red-900/30 text-red-400 border border-red-700";
    default:
      return "bg-gray-800 text-gray-400 border border-gray-700";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return "bg-blue-900/30 text-blue-400 border border-blue-700";
    case "Closed":
      return "bg-gray-800 text-gray-400 border border-gray-700";
    default:
      return "bg-gray-800 text-gray-400 border border-gray-700";
  }
};

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useReadContracts } from "wagmi";
import { BugAntIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type BountyCardProps = {
  id: string;
  owner: string;
  amount: bigint;
  status: number;
  cid: string;
};

const BountyCard = ({ id, owner, amount, status, cid }: BountyCardProps) => {
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

  return (
    <div
      className={`card bg-base-100 shadow-md hover:shadow-xl transition-shadow ${isMetadataLoading ? "animate-pulse" : ""}`}
    >
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <div className={`badge ${getSeverityColor(metadata.severity)}`}>{metadata.severity}</div>
          <div className={`badge ${getStatusColor(BountyStatus[status])}`}>{BountyStatus[status]}</div>
        </div>
        <h2 className="card-title truncate">{metadata.title}</h2>
        <p className="mb-4 line-clamp-2 h-12 text-base-content/70">{metadata.description}</p>
        <div className="flex justify-between items-center text-sm">
          <div>
            <p className="text-base-content/60">Reward</p>
            <p className="font-medium text-lg">{formatEther(amount)} ETH</p>
          </div>
          <div className="text-right">
            <p className="text-base-content/60">Posted by</p>
            <Address address={owner} format="short" />
          </div>
        </div>
        <div className="card-actions mt-4">
          <Link href={`/bounties/${id}`} className="btn btn-secondary btn-sm w-full">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};
export default function BountiesPage() {
  const { address: connectedAddress } = useAccount();

  const { data: deployedBounties, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "BountyFactory",
    functionName: "getDeployedBounties",
    watch: true,
  });

  const bountyContractsToRead = useMemo(() => {
    return (deployedBounties || []).flatMap(address => [
      { address, abi: bountyABI, functionName: "owner" },
      { address, abi: bountyABI, functionName: "amount" },
      { address, abi: bountyABI, functionName: "status" },
      { address, abi: bountyABI, functionName: "cid" },
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

    const processedBounties = [];
    for (let i = 0; i < bountiesOnChainData.length; i += 4) {
      const bountyIndex = i / 4;
      processedBounties.push({
        id: deployedBounties[bountyIndex],
        owner: bountiesOnChainData[i]?.result as string,
        amount: bountiesOnChainData[i + 1]?.result as bigint,
        status: bountiesOnChainData[i + 2]?.result as number,
        cid: bountiesOnChainData[i + 3]?.result as string,
      });
    }
    return processedBounties.sort((a, b) => a.status - b.status);
  }, [bountiesOnChainData, deployedBounties]);

  const isLoading = isLoadingAddresses || (isLoadingBountiesData && bounties.length === 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BugAntIcon className="h-8 w-8" />
          Open Bounties
        </h1>
        <Link href="/bounties/create" className="btn btn-primary">
          Create Bounty
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Loading bounties from the blockchain...</p>
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4 text-lg">No bounties found.</p>
          {connectedAddress ? (
            <p>
              Be the first to{" "}
              <Link href="/bounties/create" className="link link-primary">
                create a bounty
              </Link>
              !
            </p>
          ) : (
            <p>Please connect your wallet to view or create bounties.</p>
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
      return "badge-success";
    case "Medium":
      return "badge-warning";
    case "High":
      return "badge-error";
    case "Critical":
      return "badge-error";
    default:
      return "badge-ghost";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return "badge-info";
    case "Submitted":
      return "badge-accent";
    case "Approved":
      return "badge-success";
    case "Rejected":
      return "badge-error";
    case "Disputed":
      return "badge-warning";
    default:
      return "badge-ghost";
  }
};

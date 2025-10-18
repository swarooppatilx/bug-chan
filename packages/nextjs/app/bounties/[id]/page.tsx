"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import { formatEther } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { BugAntIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import { notification } from "~~/utils/scaffold-eth";

export default function BountyDetailsPage() {
  const { id } = useParams();
  const bountyAddress = id as `0x${string}`;
  const { address: connectedAddress } = useAccount();
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({ title: "Loading...", description: "Loading...", severity: "Medium" });

  const { data: hash, error, isPending, writeContractAsync } = useWriteContract();

  const { data: bountyData, refetch: refetchBountyData } = useReadContracts({
    contracts: [
      { address: bountyAddress, abi: bountyABI, functionName: "owner" },
      { address: bountyAddress, abi: bountyABI, functionName: "amount" },
      { address: bountyAddress, abi: bountyABI, functionName: "cid" },
      { address: bountyAddress, abi: bountyABI, functionName: "status" },
      { address: bountyAddress, abi: bountyABI, functionName: "reportCid" },
      { address: bountyAddress, abi: bountyABI, functionName: "researcher" },
    ],
    query: {
      refetchInterval: 5000,
    },
  });

  const [owner, amount, cid, status, reportCid, researcher] = bountyData || [];

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      notification.success("Transaction successful!");
      refetchBountyData();
    }
    if (error) {
      notification.error("Transaction failed.");
    }
  }, [isConfirmed, error, refetchBountyData]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!cid?.result) return;
      try {
        const lighthouseGatewayUrl = `https://gateway.lighthouse.storage/ipfs/${cid.result}`;
        const response = await fetch(lighthouseGatewayUrl);

        if (response.ok) {
          const meta = await response.json();
          setMetadata({
            title: meta.title || `Bounty: ${bountyAddress.substring(0, 8)}...`,
            description: meta.description || "No description provided",
            severity: meta.severity || "Medium",
          });
        } else {
          throw new Error(`Lighthouse gateway returned status ${response.status}`);
        }
      } catch (e) {
        console.error("Failed to fetch bounty metadata:", e);
        setMetadata(prev => ({ ...prev, description: "Failed to load bounty details from IPFS." }));
      }
    };
    fetchMetadata();
  }, [cid?.result, bountyAddress]);

  const handleSubmitReport = async () => {
    if (!reportFile) return notification.error("Please select a report file");
    try {
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      if (!apiKey) throw new Error("Lighthouse API key not set");
      notification.info("Uploading report to IPFS...");
      const response = await lighthouse.upload(reportFile, apiKey);
      notification.success("Report uploaded!");
      await writeContractAsync({
        address: bountyAddress,
        abi: bountyABI,
        functionName: "submitReport",
        args: [response.data.Hash],
      });
    } catch (e: any) {
      notification.error(e.shortMessage || "Failed to submit report");
    }
  };

  const handleApprove = () =>
    writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "approveSubmission" });
  const handleReject = () =>
    writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "rejectSubmission" });

  const isOwner = connectedAddress === owner?.result;
  const currentStatus = status?.result !== undefined ? BountyStatus[status.result] : "Loading...";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-6">
            <BugAntIcon className="h-6 w-6" />
            <h1 className="card-title text-2xl">Bounty Details</h1>
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">{metadata.title}</h2>
              <p className="whitespace-pre-wrap text-base-content/80">{metadata.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-base-300">
              <div>
                <h3 className="font-medium mb-1 text-base-content/60">Reward</h3>
                <p className="font-semibold text-lg">
                  {amount?.result ? `${formatEther(amount.result)} ETH` : "0 ETH"}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1 text-base-content/60">Status</h3>
                <p className={`capitalize font-semibold text-lg`}>{currentStatus}</p>
              </div>
              <div>
                <h3 className="font-medium mb-1 text-base-content/60">Posted by</h3>
                <Address address={owner?.result as string} />
              </div>
              <div>
                <h3 className="font-medium mb-1 text-base-content/60">Severity</h3>
                <p>{metadata.severity}</p>
              </div>
              {cid?.result && (
                <div className="md:col-span-2">
                  <h3 className="font-medium mb-1 text-base-content/60">Bounty CID</h3>
                  <p className="break-all text-sm font-mono">{cid.result}</p>
                </div>
              )}
              {researcher?.result && researcher.result !== "0x0000000000000000000000000000000000000000" && (
                <div>
                  <h3 className="font-medium mb-1 text-base-content/60">Researcher</h3>
                  <Address address={researcher.result as string} />
                </div>
              )}
              {reportCid?.result && (
                <div className="md:col-span-2">
                  <h3 className="font-medium mb-1 text-base-content/60">Report CID</h3>
                  <p className="break-all text-sm font-mono">{reportCid.result}</p>
                </div>
              )}
            </div>
            {currentStatus === "Open" && (
              <div className="mt-8 pt-6 border-t border-base-300">
                <h2 className="card-title mb-4">Submit Vulnerability Report</h2>
                <div className="space-y-4">
                  <input
                    type="file"
                    onChange={e => setReportFile(e.target.files?.[0] || null)}
                    className="file-input file-input-bordered w-full"
                  />
                  <button onClick={handleSubmitReport} disabled={isPending || !reportFile} className="btn btn-primary">
                    {isPending ? <span className="loading loading-spinner"></span> : "Submit Report"}
                  </button>
                </div>
              </div>
            )}
            {currentStatus === "Submitted" && isOwner && (
              <div className="mt-8 pt-6 border-t border-base-300 card-actions">
                <button onClick={handleApprove} disabled={isPending} className="btn btn-success">
                  {isPending ? <span className="loading loading-spinner"></span> : "Approve Submission"}
                </button>
                <button onClick={handleReject} disabled={isPending} className="btn btn-error">
                  {isPending ? <span className="loading loading-spinner"></span> : "Reject Submission"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

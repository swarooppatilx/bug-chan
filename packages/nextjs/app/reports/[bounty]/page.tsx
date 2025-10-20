"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import { formatEther } from "viem";
import { useAccount, useReadContracts, useSignMessage, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { EyeIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import { notification } from "~~/utils/scaffold-eth";

export default function ReportDetailsPage() {
  const { bounty } = useParams();
  const bountyAddress = bounty as `0x${string}`;
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const { data: hash, error, isPending, writeContractAsync } = useWriteContract();

  const { data: bountyData, refetch } = useReadContracts({
    contracts: [
      { address: bountyAddress, abi: bountyABI, functionName: "owner" },
      { address: bountyAddress, abi: bountyABI, functionName: "amount" },
      { address: bountyAddress, abi: bountyABI, functionName: "status" },
      { address: bountyAddress, abi: bountyABI, functionName: "reportCid" },
      { address: bountyAddress, abi: bountyABI, functionName: "researcher" },
      { address: bountyAddress, abi: bountyABI, functionName: "stakedAmount" },
      { address: bountyAddress, abi: bountyABI, functionName: "minStake" },
    ],
    query: { refetchInterval: 5000 },
  });

  const [owner, amount, status, reportCid, researcher, stakedAmount] = bountyData || [];

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isConfirmed) {
      notification.success("Transaction successful");
      refetch();
    }
    if (error) {
      notification.error("Transaction failed");
    }
  }, [isConfirmed, error, refetch]);

  const isOwner = connectedAddress === (owner?.result as string);
  const currentStatus = status?.result !== undefined ? BountyStatus[status.result] : "Loading...";
  const reportCidStr = (reportCid?.result as string) || "";

  const handleApprove = () =>
    writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "approveSubmission" });
  const handleReject = () =>
    writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "rejectSubmission" });

  const [reportJson, setReportJson] = useState<any | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  useEffect(() => {
    setReportJson(null);
  }, [reportCidStr]);

  const handleDecrypt = async () => {
    if (!reportCidStr) return;
    if (!connectedAddress) return notification.error("Connect your wallet to decrypt.");
    try {
      setDecrypting(true);
      const { data: auth } = await lighthouse.getAuthMessage(connectedAddress);
      if (typeof auth?.message !== "string") throw new Error("Failed to get auth message");
      const signedMessage = await signMessageAsync({ message: auth.message });
      const keyObject = await lighthouse.fetchEncryptionKey(reportCidStr, connectedAddress, signedMessage);
      const key = keyObject?.data?.key;
      if (typeof key !== "string") throw new Error("Failed to fetch encryption key");
      const fileType = "application/json";
      const decrypted = await lighthouse.decryptFile(reportCidStr, key, fileType);
      const text = await decrypted.text();
      const json = JSON.parse(text);
      setReportJson(json);
      notification.success("Report decrypted");
    } catch (e: any) {
      console.error("decrypt error", e);
      notification.error(e?.message || "Failed to decrypt report");
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-6">
            <EyeIcon className="h-6 w-6" />
            <h1 className="card-title text-2xl">Report Details</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base-content/60">Bounty</h3>
              <Address address={bountyAddress} />
            </div>
            <div>
              <h3 className="text-base-content/60">Owner</h3>
              <Address address={owner?.result as string} />
            </div>
            <div>
              <h3 className="text-base-content/60">Researcher</h3>
              <Address address={researcher?.result as string} />
            </div>
            <div>
              <h3 className="text-base-content/60">Status</h3>
              <div className="badge badge-outline">{currentStatus}</div>
            </div>
            <div>
              <h3 className="text-base-content/60">Reward</h3>
              <div>{amount?.result ? `${formatEther(amount.result)} ETH` : "0 ETH"}</div>
            </div>
            <div>
              <h3 className="text-base-content/60">Staked</h3>
              <div>{stakedAmount?.result ? `${formatEther(stakedAmount.result)} ETH` : "0 ETH"}</div>
            </div>
            {reportCidStr && (
              <div className="md:col-span-2">
                <h3 className="text-base-content/60">Report CID</h3>
                <div className="font-mono text-xs break-all">{reportCidStr}</div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-base-300">
            <div className="flex items-center justify-between">
              <h2 className="card-title mb-2">Report Content</h2>
              {isOwner && !reportJson && (
                <button className="btn btn-sm" onClick={handleDecrypt} disabled={decrypting}>
                  {decrypting ? <span className="loading loading-spinner" /> : "Decrypt"}
                </button>
              )}
            </div>
            {reportJson ? (
              <div className="space-y-2">
                {reportJson.title && (
                  <div>
                    <strong>Title:</strong> {reportJson.title}
                  </div>
                )}
                {reportJson.severity && (
                  <div>
                    <strong>Severity:</strong> {reportJson.severity}
                  </div>
                )}
                {reportJson.description && (
                  <div>
                    <strong>Description:</strong>
                    <p className="whitespace-pre-wrap mt-1 text-base-content/80">{reportJson.description}</p>
                  </div>
                )}
                {reportJson.contact && (
                  <div>
                    <strong>Contact:</strong> {reportJson.contact}
                  </div>
                )}
                {reportJson.submittedAt && (
                  <div className="text-xs text-base-content/60">
                    Submitted: {new Date(reportJson.submittedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-base-content/60">Encrypted report. Only the bounty owner can decrypt.</div>
            )}
          </div>

          {isOwner && currentStatus === "Submitted" && (
            <div className="mt-6 card-actions">
              <button onClick={handleApprove} disabled={isPending} className="btn btn-success">
                {isPending ? <span className="loading loading-spinner"></span> : "Approve & Payout"}
              </button>
              <button onClick={handleReject} disabled={isPending} className="btn btn-error">
                {isPending ? <span className="loading loading-spinner"></span> : "Reject & Slash"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

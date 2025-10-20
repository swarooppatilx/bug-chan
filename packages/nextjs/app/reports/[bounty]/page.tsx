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
      <div className="bg-gray-900 border border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <EyeIcon className="h-6 w-6 text-[var(--color-secondary)]" />
          <h1 className="text-2xl font-akira text-white">Report Details</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Bounty</h3>
            <Address address={bountyAddress} />
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Owner</h3>
            <Address address={owner?.result as string} />
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Researcher</h3>
            <Address address={researcher?.result as string} />
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Status</h3>
            <div className="px-3 py-1 bg-gray-800 border border-gray-700 text-white inline-block text-sm font-roboto">
              {currentStatus}
            </div>
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Reward</h3>
            <div className="text-[var(--color-secondary)] font-roboto font-semibold">
              {amount?.result ? `${formatEther(amount.result)} ETH` : "0 ETH"}
            </div>
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Staked</h3>
            <div className="text-white font-roboto">
              {stakedAmount?.result ? `${formatEther(stakedAmount.result)} ETH` : "0 ETH"}
            </div>
          </div>
          {reportCidStr && (
            <div className="md:col-span-2">
              <h3 className="text-gray-500 font-roboto text-sm mb-2">Report CID</h3>
              <div className="font-mono text-xs break-all text-gray-400">{reportCidStr}</div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-akira text-white">Report Content</h2>
            {isOwner && !reportJson && (
              <button
                className="px-4 py-2 bg-[var(--color-secondary)] hover:opacity-90 text-black font-roboto text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
                onClick={handleDecrypt}
                disabled={decrypting}
              >
                {decrypting ? (
                  <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Decrypt"
                )}
              </button>
            )}
          </div>
          {reportJson ? (
            <div className="space-y-4 bg-black border border-gray-800 p-6">
              {reportJson.title && (
                <div>
                  <strong className="text-gray-400 font-roboto text-sm">Title:</strong>{" "}
                  <span className="text-white font-roboto">{reportJson.title}</span>
                </div>
              )}
              {reportJson.severity && (
                <div>
                  <strong className="text-gray-400 font-roboto text-sm">Severity:</strong>{" "}
                  <span className="text-white font-roboto">{reportJson.severity}</span>
                </div>
              )}
              {reportJson.description && (
                <div>
                  <strong className="text-gray-400 font-roboto text-sm block mb-2">Description:</strong>
                  <p className="whitespace-pre-wrap text-gray-300 font-roboto leading-relaxed">
                    {reportJson.description}
                  </p>
                </div>
              )}
              {reportJson.contact && (
                <div>
                  <strong className="text-gray-400 font-roboto text-sm">Contact:</strong>{" "}
                  <span className="text-white font-roboto">{reportJson.contact}</span>
                </div>
              )}
              {reportJson.submittedAt && (
                <div className="text-xs text-gray-500 font-roboto">
                  Submitted: {new Date(reportJson.submittedAt).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 font-roboto bg-black border border-gray-800 p-6">
              Encrypted report. Only the bounty owner can decrypt.
            </div>
          )}
        </div>

        {isOwner && currentStatus === "Submitted" && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-roboto font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                "Approve & Payout"
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-roboto font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                "Reject & Slash"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

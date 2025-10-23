"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import { formatEther, parseAbiItem } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContracts,
  useSignMessage,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { EyeIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, SubmissionStatus, bountyABI } from "~~/contracts/BountyABI";
import deployedContracts from "~~/contracts/deployedContracts";
import { notification } from "~~/utils/scaffold-eth";

export default function ReportDetailsPage() {
  const { bounty } = useParams();
  const bountyAddress = bounty as `0x${string}`;
  const searchParams = useSearchParams();
  const researcherAddr = (searchParams.get("researcher") || "") as `0x${string}`;
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [committedAmount, setCommittedAmount] = useState<bigint | null>(null);

  const { data: hash, error, isPending, writeContractAsync } = useWriteContract();

  const { data: bountyData, refetch } = useReadContracts({
    contracts: [
      { address: bountyAddress, abi: bountyABI, functionName: "owner" },
      { address: bountyAddress, abi: bountyABI, functionName: "amount" },
      { address: bountyAddress, abi: bountyABI, functionName: "status" },
      { address: bountyAddress, abi: bountyABI, functionName: "stakeAmount" },
      ...(researcherAddr
        ? [{ address: bountyAddress, abi: bountyABI, functionName: "getSubmission", args: [researcherAddr] }]
        : []),
    ],
    query: { refetchInterval: 5000 },
  });

  const [owner, amount, status, stakeAmount, submissionTuple] = bountyData || [];

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
        for (const log of logs as any[]) {
          if ((log.args?.bountyAddress as string)?.toLowerCase() === bountyAddress.toLowerCase()) {
            if (!cancelled) setCommittedAmount((log.args?.amount as bigint) ?? 0n);
            break;
          }
        }
      } catch (e) {
        console.warn("Failed to load committed amount", e);
      }
    };
    loadCommitted();
    return () => {
      cancelled = true;
    };
  }, [publicClient, chainId, bountyAddress]);

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
  const statusIdx = useMemo(() => Number(status?.result ?? 0), [status?.result]);
  const currentStatus = BountyStatus[statusIdx] ?? "Loading...";
  const [reportCidStr, subState] = useMemo(() => {
    if (!submissionTuple?.result) return ["", 0] as [string, number];
    const [cid, , state] = submissionTuple.result as [string, bigint, number];
    return [cid, Number(state || 0)];
  }, [submissionTuple?.result]);

  const handleAccept = () =>
    writeContractAsync({
      address: bountyAddress,
      abi: bountyABI,
      functionName: "acceptSubmission",
      args: [researcherAddr],
    });
  const handleReject = () =>
    writeContractAsync({
      address: bountyAddress,
      abi: bountyABI,
      functionName: "rejectSubmission",
      args: [researcherAddr],
    });

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
          {researcherAddr && (
            <div>
              <h3 className="text-gray-500 font-roboto text-sm mb-2">Researcher</h3>
              <Address address={researcherAddr} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Status</h3>
            <div className="px-3 py-1 bg-gray-800 border border-gray-700 text-white inline-block text-sm font-roboto">
              {currentStatus}
            </div>
            {reportCidStr && (
              <div
                className={`px-3 py-1 text-xs font-roboto font-medium ${
                  subState === 1
                    ? "bg-purple-900/30 text-purple-400 border border-purple-700"
                    : subState === 2
                      ? "bg-green-900/30 text-green-400 border border-green-700"
                      : subState === 3
                        ? "bg-red-900/30 text-red-400 border border-red-700"
                        : subState === 4
                          ? "bg-gray-800 text-gray-400 border border-gray-700"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}
              >
                {SubmissionStatus[subState]}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Reward</h3>
            <div className="text-[var(--color-secondary)] font-roboto font-semibold">
              {committedAmount != null
                ? `${formatEther(committedAmount)} ETH`
                : amount?.result
                  ? `${formatEther(amount.result as bigint)} ETH`
                  : "0 ETH"}
            </div>
          </div>
          <div>
            <h3 className="text-gray-500 font-roboto text-sm mb-2">Staked</h3>
            <div className="text-white font-roboto">
              {stakeAmount?.result ? `${formatEther(stakeAmount.result as bigint)} ETH` : "0 ETH"}
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
            {(isOwner ||
              (connectedAddress && connectedAddress.toLowerCase() === (researcherAddr || "").toLowerCase())) &&
              !reportJson && (
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
              Encrypted report. Only the bounty owner or the report&apos;s author can decrypt.
            </div>
          )}
        </div>

        {isOwner && currentStatus === "Open" && researcherAddr && subState === 1 && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-roboto font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                "Accept"
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

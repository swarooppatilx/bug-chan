"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

// Consistent badge styles
const BADGE_BASE = "inline-flex items-center h-7 px-3 border text-xs font-roboto";
const BADGE_NEUTRAL = `${BADGE_BASE} bg-gray-800 border-gray-700 text-white`;
const BADGE_PURPLE = `${BADGE_BASE} bg-purple-900/30 border-purple-700 text-purple-400`;
const BADGE_GREEN = `${BADGE_BASE} bg-green-900/30 border-green-700 text-green-400`;
const BADGE_RED = `${BADGE_BASE} bg-red-900/30 border-red-700 text-red-400`;
const BADGE_GRAY = `${BADGE_BASE} bg-gray-800 border-gray-700 text-gray-400`;

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
  const [reportCidStr, subState, visibility] = useMemo(() => {
    if (!submissionTuple?.result) return ["", 0, 0] as [string, number, number];
    const [cid, , state, vis] = submissionTuple.result as [string, bigint, number, number];
    return [cid, Number(state || 0), Number(vis || 0)];
  }, [submissionTuple?.result]);

  // Allow making public only when:
  // - currently Private
  // - owner can always do it
  // - researcher can do it only when not Pending and while no fix is in progress
  const canMakePublic =
    visibility === 0 &&
    (isOwner ||
      (connectedAddress && connectedAddress.toLowerCase() === (researcherAddr || "").toLowerCase() && subState !== 1));

  const handleAccept = () =>
    writeContractAsync({
      address: bountyAddress,
      abi: bountyABI,
      functionName: "acceptSubmission",
      args: [researcherAddr],
    });

  // Reject without auto-publication; users can disclose later via "Disclose" button
  const handleReject = async () => {
    if (!researcherAddr) return;
    if (!connectedAddress) return notification.error("Connect your wallet.");
    try {
      await writeContractAsync({
        address: bountyAddress,
        abi: bountyABI,
        functionName: "rejectSubmission",
        args: [researcherAddr],
      });
      notification.success("Submission rejected");
      refetch();
    } catch (e: any) {
      console.error("reject error", e);
      notification.error(e?.message || "Failed to reject submission");
    }
  };
  const [reportJson, setReportJson] = useState<any | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [updatingVis, setUpdatingVis] = useState(false);
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

  const handleMakePublic = async () => {
    if (!reportCidStr) return;
    if (!connectedAddress) return notification.error("Connect your wallet.");
    try {
      setUpdatingVis(true);
      // Ensure we have the plaintext JSON
      let json = reportJson;
      if (!json) {
        const { data: auth } = await lighthouse.getAuthMessage(connectedAddress);
        if (typeof auth?.message !== "string") throw new Error("Failed to get auth message");
        const signedMessage = await signMessageAsync({ message: auth.message });
        const keyObject = await lighthouse.fetchEncryptionKey(reportCidStr, connectedAddress, signedMessage);
        const key = keyObject?.data?.key;
        if (typeof key !== "string") throw new Error("Failed to fetch encryption key");
        const fileType = "application/json";
        const decrypted = await lighthouse.decryptFile(reportCidStr, key, fileType);
        const text = await decrypted.text();
        json = JSON.parse(text);
      }
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      if (!apiKey) throw new Error("Lighthouse API key not set");
      const uploadRes = await lighthouse.uploadText(JSON.stringify(json), apiKey);
      const hash = uploadRes?.data?.Hash;
      if (typeof hash !== "string" || !hash.length) throw new Error("Failed to upload public report");

      await writeContractAsync({
        address: bountyAddress,
        abi: bountyABI,
        functionName: "setSubmissionVisibility",
        args: [researcherAddr, 1, hash], // 1 = Public
      });
      notification.success("Report made public");
      refetch();
    } catch (e: any) {
      notification.error(e?.message || "Failed to make report public");
    } finally {
      setUpdatingVis(false);
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
            <div className={BADGE_NEUTRAL}>{currentStatus}</div>
            {reportCidStr && (
              <div
                className={
                  subState === 1 ? BADGE_PURPLE : subState === 2 ? BADGE_GREEN : subState === 3 ? BADGE_RED : BADGE_GRAY
                }
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
            <div className="flex items-center gap-3">
              <h3 className="text-gray-500 font-roboto text-sm mb-2">Visibility</h3>
              <div className={visibility === 1 ? BADGE_GREEN : BADGE_GRAY}>
                {visibility === 1 ? "Public" : "Private"}
              </div>
              {canMakePublic && (
                <button
                  className="px-3 h-7 inline-flex items-center bg-[var(--color-secondary)] hover:opacity-90 text-black text-xs font-roboto transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
                  onClick={handleMakePublic}
                  disabled={updatingVis || decrypting}
                >
                  {updatingVis ? "Disclosing..." : "Disclose"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Report Content */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-akira text-white">Report Content</h2>
            {(isOwner ||
              (connectedAddress && connectedAddress.toLowerCase() === (researcherAddr || "").toLowerCase())) &&
              !reportJson &&
              visibility === 0 && (
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
              {reportJson.description && (
                <div>
                  <strong className="text-gray-400 font-roboto text-sm block mb-2">Description:</strong>
                  <div className="font-roboto text-gray-300 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportJson.description}</ReactMarkdown>
                  </div>
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
          ) : visibility === 1 && reportCidStr ? (
            <PublicReport cid={reportCidStr} />
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

// Small helper to render public JSON without decrypt
function PublicReport({ cid }: { cid: string }) {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`);
        if (res.ok) {
          const j = await res.json();
          if (!cancelled) setData(j);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [cid]);
  if (!data) {
    return (
      <div className="text-gray-400 font-roboto bg-black border border-gray-800 p-6">Loading public report...</div>
    );
  }
  return (
    <div className="space-y-4 bg-black border border-gray-800 p-6">
      {data.title && (
        <div>
          <strong className="text-gray-400 font-roboto text-sm">Title:</strong>{" "}
          <span className="text-white font-roboto">{data.title}</span>
        </div>
      )}
      {data.description && (
        <div>
          <strong className="text-gray-400 font-roboto text-sm block mb-2">Description:</strong>
          <div className="font-roboto text-gray-300 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.description}</ReactMarkdown>
          </div>
        </div>
      )}
      {data.contact && (
        <div>
          <strong className="text-gray-400 font-roboto text-sm">Contact:</strong>{" "}
          <span className="text-white font-roboto">{data.contact}</span>
        </div>
      )}
    </div>
  );
}

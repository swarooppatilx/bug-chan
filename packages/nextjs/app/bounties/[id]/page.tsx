"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContracts, useSignMessage, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { BugAntIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import { notification } from "~~/utils/scaffold-eth";

export default function BountyDetailsPage() {
  const { id } = useParams();
  const bountyAddress = id as `0x${string}`;
  const { address: connectedAddress } = useAccount();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [stakeEth, setStakeEth] = useState("0.01");
  const [metadata, setMetadata] = useState({ title: "Loading...", description: "Loading...", severity: "Medium" });
  const [newMinStakeEth, setNewMinStakeEth] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: hash, error, isPending, writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const { data: bountyData, refetch: refetchBountyData } = useReadContracts({
    contracts: [
      { address: bountyAddress, abi: bountyABI, functionName: "owner" },
      { address: bountyAddress, abi: bountyABI, functionName: "amount" },
      { address: bountyAddress, abi: bountyABI, functionName: "cid" },
      { address: bountyAddress, abi: bountyABI, functionName: "status" },
      { address: bountyAddress, abi: bountyABI, functionName: "reportCid" },
      { address: bountyAddress, abi: bountyABI, functionName: "researcher" },
      { address: bountyAddress, abi: bountyABI, functionName: "minStake" },
      { address: bountyAddress, abi: bountyABI, functionName: "stakedAmount" },
    ],
    query: {
      refetchInterval: 5000,
    },
  });

  const [owner, amount, cid, status, reportCid, researcher, minStake] = bountyData || [];

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

  const minStakeEth = useMemo(
    () => (minStake?.result ? formatEther(minStake.result as bigint) : "0.0"),
    [minStake?.result],
  );

  useEffect(() => {
    if (minStake?.result) {
      setStakeEth(formatEther(minStake.result as bigint));
    }
  }, [minStake?.result]);

  const handleSubmitReport = async () => {
    if (!title.trim() || !description.trim()) return notification.error("Please fill in title and description");
    if (!stakeEth || Number(stakeEth) <= 0) return notification.error("Enter a valid stake amount");
    try {
      setSubmitting(true);
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      const payload = {
        title: title.trim(),
        severity,
        description: description.trim(),
        contact: contact.trim(),
        bountyAddress,
        submittedAt: new Date().toISOString(),
      };
      if (!apiKey) throw new Error("Lighthouse API key not set. Please set NEXT_PUBLIC_LIGHTHOUSE_API_KEY.");
      if (!connectedAddress) throw new Error("Connect your wallet to submit a report.");
      // Authenticate with Lighthouse (sign message)
      const { data: auth } = await lighthouse.getAuthMessage(connectedAddress);
      if (!auth?.message) throw new Error("Failed to get auth message from Lighthouse");
      const signedMessage = await signMessageAsync({ message: String(auth.message) });
      notification.info("Uploading encrypted report to IPFS...");
      // Prepare a FileList since the browser SDK expects a FileList for uploadEncrypted
      const jsonText = JSON.stringify(payload, null, 2);
      const reportFile = new File([jsonText], "bug-report.json", { type: "application/json" });
      const dt = new DataTransfer();
      dt.items.add(reportFile);
      const fileList = dt.files; // FileList

      const progressCallback = (data: { total: number; uploaded: number }) => {
        const pct = ((data.uploaded / data.total) * 100).toFixed(0);
        console.debug(`Lighthouse upload progress: ${pct}%`);
      };
      const encResponse = await (lighthouse as any).uploadEncrypted(
        fileList,
        apiKey,
        connectedAddress,
        signedMessage,
        progressCallback,
      );
      // Response commonly: { data: [ { Hash, Name, Size } ] }
      const data = encResponse?.data as unknown;
      const reportCid: string | undefined = Array.isArray(data)
        ? (data as Array<{ Hash?: string }>)[0]?.Hash
        : (data as { Hash?: string } | undefined)?.Hash;
      console.debug("lighthouse.uploadEncrypted response", encResponse);
      if (!reportCid) throw new Error("Failed to retrieve CID from Lighthouse upload response");
      notification.success("Encrypted report uploaded!");
      // Share encrypted file with bounty owner so they can decrypt
      const ownerAddr = owner?.result as string | undefined;
      if (ownerAddr && ownerAddr !== connectedAddress) {
        try {
          await (lighthouse as any).shareFile(connectedAddress as string, signedMessage as string, reportCid, [
            ownerAddr as string,
          ]);
        } catch (shareErr) {
          console.warn("Failed to share file with owner", shareErr);
        }
      }
      const valueWei = parseEther(stakeEth as `${string}`);
      if (minStake?.result && valueWei < (minStake.result as bigint)) {
        return notification.error(`Stake must be at least ${minStakeEth} ETH`);
      }
      await writeContractAsync({
        address: bountyAddress,
        abi: bountyABI,
        functionName: "submitReport",
        args: [reportCid],
        value: valueWei,
      });
      setTitle("");
      setSeverity("Medium");
      setDescription("");
      setContact("");
    } catch (e: any) {
      console.error("submitReport error", e);
      const msg: string = e?.shortMessage || e?.message || "Failed to submit report";
      const match = msg.match(/reverted with reason string \"([^\"]+)\"/i) || msg.match(/execution reverted: (.*)$/i);
      const friendly = match?.[1] || msg;
      notification.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () =>
    writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "approveSubmission" });
  const handleReject = () =>
    writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "rejectSubmission" });

  const handleSetMinStake = async () => {
    if (!newMinStakeEth || Number(newMinStakeEth) < 0) return notification.error("Enter a valid min stake");
    try {
      await writeContractAsync({
        address: bountyAddress,
        abi: bountyABI,
        functionName: "setMinStake",
        args: [parseEther(newMinStakeEth as `${string}`)],
      });
      notification.success("Min stake updated");
      setNewMinStakeEth("");
    } catch (e: any) {
      notification.error(e.shortMessage || "Failed to update min stake");
    }
  };

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
              {isOwner && (
                <div>
                  <h3 className="font-medium mb-1 text-base-content/60">Min Stake</h3>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-outline">{minStakeEth} ETH</span>
                  </div>
                </div>
              )}
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
                <h2 className="card-title mb-1">Submit Vulnerability Report</h2>
                <p className="text-sm text-base-content/60 mb-4">
                  Provide enough detail to reproduce the issue. Your stake discourages spam and is refunded on approval.
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      placeholder="Title"
                      className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-secondary/30"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                    <select
                      className="select select-bordered w-full focus:outline-none focus:ring-2 focus:ring-secondary/30"
                      value={severity}
                      onChange={e => setSeverity(e.target.value)}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                    <div>
                      <textarea
                        className="textarea textarea-bordered w-full min-h-40 rounded-md"
                        placeholder="Describe the vulnerability, reproduction steps, expected vs actual behavior, impacted components, and potential impact..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        maxLength={5000}
                      />
                      <div className="mt-1 flex justify-between text-xs text-base-content/60">
                        <span>Tip: Include minimal PoC or steps to reproduce.</span>
                        <span>{description.length}/5000</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Contact (email, Telegram, ENS, etc.)"
                      className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-secondary/30"
                      value={contact}
                      onChange={e => setContact(e.target.value)}
                    />
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Stake (ETH)</span>
                        <span className="label-text-alt">Min: {minStakeEth} ETH</span>
                      </label>
                      <input
                        type="number"
                        min={minStakeEth}
                        step="0.001"
                        className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-secondary/30"
                        value={stakeEth}
                        onChange={e => setStakeEth(e.target.value)}
                      />
                    </div>
                  </div>
                  <button onClick={handleSubmitReport} disabled={isPending || submitting} className="btn btn-primary">
                    {isPending || submitting ? (
                      <span className="loading loading-spinner"></span>
                    ) : (
                      "Submit Report & Stake"
                    )}
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
            {isOwner && (
              <div className="mt-4 flex items-end gap-2">
                <div className="form-control w-full max-w-xs">
                  <label className="label">
                    <span className="label-text">Update Min Stake (ETH)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    className="input input-bordered"
                    value={newMinStakeEth}
                    onChange={e => setNewMinStakeEth(e.target.value)}
                  />
                </div>
                <button className="btn btn-outline" disabled={isPending || !newMinStakeEth} onClick={handleSetMinStake}>
                  {isPending ? <span className="loading loading-spinner"></span> : "Set Min Stake"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

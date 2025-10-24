"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getJWT } from "@lighthouse-web3/kavach";
import lighthouse from "@lighthouse-web3/sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatEther, parseAbiItem, parseEther } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useSignMessage,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { BugAntIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { BountyStatus, bountyABI } from "~~/contracts/BountyABI";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export default function BountyDetailsPage() {
  const { id } = useParams();
  const bountyAddress = id as `0x${string}`;
  const { address: connectedAddress } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [stakeEth, setStakeEth] = useState("0.00");
  const [metadata, setMetadata] = useState({ title: "Loading...", description: "Loading...", severity: "Medium" });
  const [submitting, setSubmitting] = useState(false);
  const [submitters, setSubmitters] = useState<string[]>([]);
  const [committedAmount, setCommittedAmount] = useState<bigint>(0n);

  const { data: hash, error, isPending, writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const { data: bountyData, refetch: refetchBountyData } = useReadContracts({
    contracts: [
      { address: bountyAddress, abi: bountyABI, functionName: "owner" },
      { address: bountyAddress, abi: bountyABI, functionName: "amount" },
      { address: bountyAddress, abi: bountyABI, functionName: "cid" },
      { address: bountyAddress, abi: bountyABI, functionName: "status" },
      { address: bountyAddress, abi: bountyABI, functionName: "stakeAmount" },
      { address: bountyAddress, abi: bountyABI, functionName: "endTime" },
      { address: bountyAddress, abi: bountyABI, functionName: "getSubmitters" },
    ],
    query: {
      refetchInterval: 5000,
    },
  });

  const [owner, amount, cid, status, stakeAmount, endTimeResult, submittersResult] = bountyData || [];

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  useEffect(() => {
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
          args: { bountyAddress },
          fromBlock: fromBlockFactory,
        });
        const last = (logs as any[]).at(-1);
        const amt = (last?.args?.amount as bigint) ?? 0n;
        setCommittedAmount(amt);
      } catch (e) {
        console.warn("Failed to load committed amount", e);
      }
    };
    loadCommitted();
  }, [publicClient, targetNetwork.id, bountyAddress]);

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

  const fixedStakeEth = useMemo(
    () => (stakeAmount?.result ? formatEther(stakeAmount.result as bigint) : "0.0"),
    [stakeAmount?.result],
  );

  const endTimeTs = useMemo(() => Number(endTimeResult?.result || 0), [endTimeResult?.result]);
  const now = Date.now() / 1000;
  const isExpired = endTimeTs > 0 && now >= endTimeTs;

  useEffect(() => {
    if (stakeAmount?.result) setStakeEth(formatEther(stakeAmount.result as bigint));
  }, [stakeAmount?.result]);

  useEffect(() => {
    const addrs = (submittersResult?.result as string[] | undefined) || [];
    setSubmitters(addrs);
  }, [submittersResult?.result]);

  // Current user's submission tuple (if any)
  const { data: mySubmission } = useReadContracts({
    contracts: connectedAddress
      ? [
          {
            address: bountyAddress,
            abi: bountyABI,
            functionName: "getSubmission",
            args: [connectedAddress as `0x${string}`],
          },
        ]
      : [],
    query: { refetchInterval: 8000, enabled: !!connectedAddress },
  });
  const mySubmissionTuple = (mySubmission?.[0]?.result || ["", 0n, 0, 0]) as [string, bigint, number, number];
  const hasMySubmission = !!mySubmissionTuple[0];

  const handleSubmitReport = async () => {
    if (!title.trim() || !description.trim()) return notification.error("Please fill in title and description");
    if (!stakeEth || Number(stakeEth) <= 0) return notification.error("Enter a valid stake amount");
    try {
      setSubmitting(true);
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      const payload = {
        title: title.trim(),
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
      const signedMessage = await signMessageAsync({ message: auth.message });
      const { JWT } = await getJWT(connectedAddress, signedMessage);
      if (!JWT) throw new Error("Failed to retrieve JWT Token from Lighthouse");
      notification.info("Uploading encrypted report to IPFS...");
      // Prepare a FileList since the browser SDK expects a FileList for uploadEncrypted
      const jsonText = JSON.stringify(payload);
      const reportFile = new File([jsonText], "bug-report.json", { type: "application/json" });
      const dt = new DataTransfer();
      dt.items.add(reportFile);
      // const fileList = dt.files; // FileList

      // const progressCallback = (data) => {
      //   console.log(data);
      //   // const pct = ((data.uploaded / data.total) * 100).toFixed(0);
      //   // console.debug(`Lighthouse upload progress: ${pct}%`);
      // };
      const encResponse = await lighthouse.textUploadEncrypted(jsonText, apiKey, connectedAddress, JWT);

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
          const shareResponse = await lighthouse.shareFile(
            connectedAddress as string,
            [ownerAddr as string],
            reportCid,
            JWT,
          );
          console.log(shareResponse);
        } catch (shareErr) {
          console.warn("Failed to share file with owner", shareErr);
        }
      }
      const valueWei = parseEther(stakeEth as `${string}`);
      await writeContractAsync({
        address: bountyAddress,
        abi: bountyABI,
        functionName: "submitReport",
        args: [reportCid],
        value: valueWei,
      });
      setTitle("");
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

  // approve/reject are now handled in the Reports page

  const isOwner = connectedAddress === owner?.result;
  const currentStatus = status?.result !== undefined ? BountyStatus[status.result] : "Loading...";

  // Scoped Markdown preview components (styles affect only the live preview)
  const mdPreviewComponents = {
    h1: (props: any) => <h1 className="text-2xl font-semibold text-white mt-2 mb-3" {...props} />,
    h2: (props: any) => <h2 className="text-xl font-semibold text-white mt-2 mb-2.5" {...props} />,
    h3: (props: any) => <h3 className="text-lg font-semibold text-white mt-2 mb-2" {...props} />,
    p: (props: any) => <p className="mb-2 leading-relaxed" {...props} />,
    a: (props: any) => (
      <a className="text-[var(--color-secondary)] underline-offset-2 hover:underline break-words" {...props} />
    ),
    ul: (props: any) => <ul className="list-disc ml-6 my-2 space-y-1" {...props} />,
    ol: (props: any) => <ol className="list-decimal ml-6 my-2 space-y-1" {...props} />,
    li: (props: any) => <li className="leading-relaxed" {...props} />,
    blockquote: (props: any) => (
      <blockquote className="border-l-4 border-gray-700 pl-3 italic text-gray-400 my-3" {...props} />
    ),
    hr: () => <hr className="my-4 border-gray-800" />,
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-gray-800 text-[var(--color-secondary)] font-mono text-[0.85em]"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-black border border-gray-800 p-3 overflow-x-auto text-sm my-3">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    table: (props: any) => <table className="w-full border-collapse my-3" {...props} />,
    th: (props: any) => <th className="border border-gray-800 px-2 py-1 text-left bg-gray-900" {...props} />,
    td: (props: any) => <td className="border border-gray-800 px-2 py-1 align-top" {...props} />,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-gray-900 border border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <BugAntIcon className="h-6 w-6 text-[var(--color-secondary)]" />
          <h1 className="text-2xl font-akira text-white">Bounty Details</h1>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-akira mb-3 text-white">{metadata.title}</h2>
            <div className="prose prose-invert max-w-none font-roboto text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {metadata.description || "No description provided."}
              </ReactMarkdown>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-800">
            <div>
              <h3 className="font-roboto text-sm mb-2 text-gray-500">Reward</h3>
              <p className="font-roboto font-semibold text-2xl text-[var(--color-secondary)]">
                {formatEther(
                  (committedAmount && committedAmount > 0n
                    ? committedAmount
                    : (amount?.result as bigint) || 0n) as bigint,
                )}{" "}
                ETH
              </p>
            </div>
            <div>
              <h3 className="font-roboto text-sm mb-2 text-gray-500">Status</h3>
              <p className={`capitalize font-roboto font-semibold text-lg ${getStatusTextColor(currentStatus)}`}>
                {currentStatus}
              </p>
            </div>
            {currentStatus !== "Closed" && (
              <div>
                <h3 className="font-roboto text-sm mb-2 text-gray-500">Closes</h3>
                <p className="font-roboto text-white">
                  {endTimeTs
                    ? isExpired
                      ? "Closed (time elapsed)"
                      : new Date(endTimeTs * 1000).toLocaleString()
                    : "-"}
                </p>
              </div>
            )}
            <div>
              <h3 className="font-roboto text-sm mb-2 text-gray-500">Posted by</h3>
              <Address address={owner?.result as string} />
            </div>
            <div>
              <h3 className="font-roboto text-sm mb-2 text-gray-500">Severity</h3>
              <p className="font-roboto text-white">{metadata.severity}</p>
            </div>
            <div>
              <h3 className="font-roboto text-sm mb-2 text-gray-500">Stake</h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm font-roboto">
                  {fixedStakeEth} ETH
                </span>
              </div>
            </div>
            {cid?.result && (
              <div className="md:col-span-2">
                <h3 className="font-medium mb-1 text-base-content/60">Bounty CID</h3>
                <p className="break-all text-sm font-mono">{cid.result}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <h3 className="font-roboto text-sm mb-2 text-gray-500">Submissions</h3>
              <div className="flex items-center justify-between p-3 bg-black border border-gray-800">
                <div className="text-gray-400 font-roboto">
                  Total submissions: <span className="text-white font-medium">{submitters.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasMySubmission && connectedAddress && (
                    <a
                      href={`/reports/${bountyAddress}?researcher=${connectedAddress}`}
                      className="px-3 py-1 bg-purple-900/30 text-purple-300 border border-purple-700 text-xs font-roboto hover:bg-purple-900/40"
                    >
                      My Submission
                    </a>
                  )}
                  {isOwner && currentStatus === "Open" && (
                    <a
                      href={`/reports`}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs border border-gray-700 font-roboto"
                    >
                      Review in Reports
                    </a>
                  )}
                </div>
              </div>
              {isOwner && currentStatus === "Open" && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() =>
                      writeContractAsync({ address: bountyAddress, abi: bountyABI, functionName: "close" })
                    }
                    disabled={isPending}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-roboto border border-red-900"
                  >
                    {isPending ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Close Bounty"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {currentStatus === "Open" && !isExpired && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <h2 className="text-xl font-akira mb-2 text-white">Submit Vulnerability Report</h2>
              <p className="text-sm text-gray-400 font-roboto mb-6">
                Provide enough detail to reproduce the issue. Your stake discourages spam and is refunded on approval.
              </p>
              {connectedAddress && hasMySubmission ? (
                <div className="text-yellow-400 font-roboto bg-black border border-yellow-700/50 p-4">
                  You have already submitted a report for this bounty from this wallet.
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Title"
                    className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                  <div>
                    <textarea
                      className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors min-h-40"
                      placeholder="Describe the vulnerability, reproduction steps, expected vs actual behavior, impacted components, and potential impact... (Markdown supported)"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      maxLength={5000}
                    />
                    <div className="mt-2 flex justify-between text-xs text-gray-500 font-roboto">
                      <span>Markdown supported (bold, lists, tables, code, links).</span>
                      <span>{description.length}/5000</span>
                    </div>
                    <div className="mt-3 p-4 bg-black border border-gray-800 text-gray-300 overflow-hidden max-h-48 whitespace-pre-wrap break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdPreviewComponents}>
                        {description || "*Live preview...*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Contact (email, Telegram, ENS, etc.)"
                    className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                  />
                  <div className="text-sm text-gray-400 font-roboto">Stake required: {fixedStakeEth} ETH</div>
                  <button
                    onClick={handleSubmitReport}
                    disabled={isPending || submitting}
                    className="w-full px-6 py-3 bg-[var(--color-primary)] hover:opacity-90 text-white font-roboto font-medium transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending || submitting ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      "Submit Report & Stake"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getStatusTextColor = (status: string) => {
  switch (status) {
    case "Open":
      return "text-blue-400";
    case "Closed":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
};

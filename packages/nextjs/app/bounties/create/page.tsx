"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type BountyForm = {
  title: string;
  description: string;
  amount: string;
  projectAddress: string;
  severity: "Low" | "Medium" | "High" | "Critical";
};

export default function CreateBountyPage() {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const [form, setForm] = useState<BountyForm>({
    title: "",
    description: "",
    amount: "",
    projectAddress: connectedAddress || "",
    severity: "Medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SE-2 hook for writing to BountyFactory contract
  const { writeContractAsync: writeBountyFactoryAsync } = useScaffoldWriteContract({
    contractName: "BountyFactory",
  });

  // Upload bounty metadata to IPFS using Lighthouse
  const uploadToIPFS = async (metadata: Omit<BountyForm, "amount" | "projectAddress">) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY; // Set this in your .env.local
      const response = await lighthouse.uploadText(JSON.stringify(metadata), apiKey || "");
      return response.data.Hash;
    } catch (error) {
      notification.error("Failed to upload to IPFS");
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Upload metadata to IPFS
      const cid = await uploadToIPFS({
        title: form.title,
        description: form.description,
        severity: form.severity,
      });

      // Call BountyFactory to create the bounty
      await writeBountyFactoryAsync({
        functionName: "createBounty",
        args: [form.projectAddress, cid],
        value: parseEther(form.amount),
      });

      notification.success("Bounty created successfully!");
      router.push("/bounties");
    } catch (error) {
      notification.error("Failed to create bounty");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Create a New Bounty</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Smart Contract Reentrancy Bug"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={5}
            placeholder="Describe the scope and requirements for this bounty..."
            required
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bounty Amount (ETH)</label>
          <EtherInput value={form.amount} onChange={value => setForm({ ...form, amount: value })} placeholder="0.1" />
        </div>

        {/* Project Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Address</label>
          <AddressInput value={form.projectAddress} onChange={value => setForm({ ...form, projectAddress: value })} />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <select
            value={form.severity}
            onChange={e => setForm({ ...form, severity: e.target.value as BountyForm["severity"] })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-md text-white font-medium ${
            isSubmitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } transition-colors`}
        >
          {isSubmitting ? "Creating Bounty..." : "Create Bounty"}
        </button>
      </form>
    </div>
  );
}

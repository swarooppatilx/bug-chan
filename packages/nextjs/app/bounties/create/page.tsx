"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
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

type FormFieldProps = {
  label: string;
  icon: ReactNode;
  helperText?: string;
  children: ReactNode;
};

const FormField = ({ label, icon, helperText, children }: FormFieldProps) => (
  <div>
    <label className="label">
      <span className="label-text flex items-center gap-2 text-base">
        {icon} {label}
      </span>
    </label>
    {children}
    {helperText && (
      <label className="label">
        <span className="label-text-alt">{helperText}</span>
      </label>
    )}
  </div>
);

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

  const { writeContractAsync: writeBountyFactoryAsync } = useScaffoldWriteContract("BountyFactory");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      notification.error("Bounty amount must be greater than 0.");
      return;
    }
    if (!form.projectAddress) {
      notification.error("Project Address (Owner) is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      if (!apiKey) throw new Error("Lighthouse API key is not set in .env.local");

      notification.info("Uploading bounty details to IPFS...");
      const response = await lighthouse.uploadText(
        JSON.stringify({
          title: form.title,
          description: form.description,
          severity: form.severity,
        }),
        apiKey,
      );
      const cid = response.data.Hash;
      notification.success("Details uploaded to IPFS!");

      await writeBountyFactoryAsync({
        functionName: "createBounty",
        args: [form.projectAddress, cid],
        value: parseEther(form.amount),
      });

      notification.success("Bounty created successfully! Redirecting...");
      router.push("/bounties");
    } catch (error) {
      console.error("Failed to create bounty:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="card max-w-3xl mx-auto bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <PencilSquareIcon className="h-8 w-8" />
            <h1 className="card-title text-3xl">Create a New Bounty</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Title" icon={<DocumentTextIcon className="h-5 w-5" />}>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="input input-bordered w-full rounded-md"
                placeholder="e.g., Smart Contract Reentrancy Bug"
                required
              />
            </FormField>

            <FormField label="Description" icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="textarea textarea-bordered w-full text-base rounded-md"
                rows={6}
                placeholder="Describe the scope, vulnerability impact, and requirements for this bounty..."
                required
              />
            </FormField>

            <div className="divider">Bounty Parameters</div>

            {/* Grid for amount and severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Bounty Amount (ETH)" icon={<CurrencyDollarIcon className="h-5 w-5" />}>
                <EtherInput
                  value={form.amount}
                  onChange={value => setForm({ ...form, amount: value })}
                  placeholder="0.1"
                />
              </FormField>

              <FormField
                label="Severity"
                icon={<ShieldExclamationIcon className="h-5 w-5" />}
                helperText="How critical is the potential vulnerability?"
              >
                <select
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value as BountyForm["severity"] })}
                  className="select select-bordered w-full rounded-md"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </FormField>
            </div>

            <FormField
              label="Project Address (Bounty Owner)"
              icon={<UserCircleIcon className="h-5 w-5" />}
              helperText="This address will own the bounty and has the authority to approve or reject submissions."
            >
              <AddressInput
                value={form.projectAddress}
                onChange={value => setForm({ ...form, projectAddress: value })}
                placeholder="The address that will manage the bounty"
              />
            </FormField>

            <div className="card-actions justify-end mt-6">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-full rounded-md">
                {isSubmitting ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <>
                    <RocketLaunchIcon className="h-5 w-5" />
                    Create Bounty
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

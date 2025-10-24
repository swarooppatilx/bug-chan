"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import lighthouse from "@lighthouse-web3/sdk";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PencilSquareIcon,
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
  stake: string;
  durationDays: string;
};

type FormFieldProps = {
  label: string;
  icon: ReactNode;
  helperText?: string;
  children: ReactNode;
};

const FormField = ({ label, icon, helperText, children }: FormFieldProps) => (
  <div>
    <label className="block mb-2">
      <span className="flex items-center gap-2 text-base font-roboto text-white">
        {icon} {label}
      </span>
    </label>
    {children}
    {helperText && <p className="mt-1 text-xs text-gray-400 font-roboto">{helperText}</p>}
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
    stake: "0.01",
    durationDays: "7",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContractAsync: writeBountyFactoryAsync } = useScaffoldWriteContract("BountyFactory");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      notification.error("Bounty amount must be greater than 0.");
      return;
    }
    if (!form.stake || parseFloat(form.stake) <= 0) {
      notification.error("Stake must be greater than 0.");
      return;
    }
    if (!form.projectAddress) {
      notification.error("Project Address (Owner) is required.");
      return;
    }
    const durationDaysNum = parseInt(form.durationDays || "0", 10);
    if (!Number.isFinite(durationDaysNum) || durationDaysNum <= 0) {
      notification.error("Duration must be a positive number of days.");
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
        args: [form.projectAddress, cid, parseEther(form.stake), BigInt(durationDaysNum * 24 * 60 * 60)],
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
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto bg-gray-900 border border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <PencilSquareIcon className="h-8 w-8 text-[var(--color-secondary)]" />
          <h1 className="text-3xl font-akira text-white">Create a New Bounty</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField label="Title" icon={<DocumentTextIcon className="h-5 w-5" />}>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
              placeholder="e.g., Smart Contract Reentrancy Bug"
              required
            />
          </FormField>

          <FormField label="Description" icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors min-h-32"
              rows={6}
              placeholder="Describe the scope, vulnerability impact, and requirements for this bounty... (Markdown supported)"
              required
            />
            <p className="mt-1 text-xs text-gray-500 font-roboto">
              Markdown supported (bold, lists, tables, code, links).
            </p>
            <div className="mt-3 p-4 bg-black border border-gray-800 text-gray-300 overflow-hidden max-h-48 whitespace-pre-wrap break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdPreviewComponents}>
                {form.description || "*Live preview...*"}
              </ReactMarkdown>
            </div>
          </FormField>

          <div className="pt-4 border-t border-gray-800">
            <h3 className="text-lg font-roboto font-medium text-white mb-4">Bounty Parameters</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Bounty Amount (ETH)" icon={<CurrencyDollarIcon className="h-5 w-5" />}>
                <EtherInput
                  value={form.amount}
                  onChange={value => setForm({ ...form, amount: value })}
                  placeholder="0.1"
                />
              </FormField>

              <FormField
                label="Stake (ETH)"
                icon={<CurrencyDollarIcon className="h-5 w-5" />}
                helperText="Researchers must stake exactly this amount to submit."
              >
                <EtherInput
                  value={form.stake}
                  onChange={value => setForm({ ...form, stake: value })}
                  placeholder="0.01"
                />
              </FormField>

              <FormField
                label="Duration (days)"
                icon={<DocumentTextIcon className="h-5 w-5" />}
                helperText="How long the bounty stays open before it closes automatically."
              >
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.durationDays}
                  onChange={e => setForm({ ...form, durationDays: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
                  placeholder="7"
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
                  className="w-full px-4 py-3 bg-black border border-gray-800 text-white font-roboto focus:outline-none focus:border-[var(--color-secondary)]/50 transition-colors"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </FormField>
            </div>
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

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-[var(--color-secondary)] hover:opacity-90 text-black font-roboto font-medium text-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Bounty</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

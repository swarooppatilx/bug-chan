import React from "react";
import Image from "next/image";
import { CodeBracketIcon } from "@heroicons/react/24/outline";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="w-full border-t border-gray-800 bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Left - Logo and Description */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="relative w-28 h-7">
              <Image alt="BugChan logo" fill src="/logo.svg" style={{ objectFit: "contain" }} />
            </div>
            <p className="text-sm font-roboto font-light text-gray-400 text-center md:text-left max-w-sm">
              Decentralized bug bounty platform securing web3, one vulnerability at a time.
            </p>
          </div>

          {/* Right - Links and Hackathon Info */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-start justify-end  text-sm font-roboto text-gray-400">
              <a
                href="https://github.com/swarooppatilx/bug-chan"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[var(--color-secondary)] transition-colors duration-300"
              >
                <CodeBracketIcon className="h-4 w-4" />
                <span>GitHub</span>
              </a>
              <span className="text-gray-600">·</span>
            </div>
            <p className="text-xs font-roboto text-gray-500">Built for ETHOnline 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};

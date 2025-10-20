import { useRef } from "react";
import { NetworkOptions } from "./NetworkOptions";
import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <details ref={dropdownRef} className="relative group mr-2">
      <summary className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-all duration-300 list-none hover:scale-105 active:scale-95 font-roboto text-sm font-medium">
        <span>Wrong network</span>
        <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <ul className="absolute right-0 mt-2 w-56 bg-black border border-red-500/30 shadow-lg z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
        <NetworkOptions />
        <li className="list-none">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:translate-x-1 active:scale-95"
            type="button"
            onClick={() => disconnect()}
          >
            <ArrowLeftOnRectangleIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            <span>Disconnect</span>
          </button>
        </li>
      </ul>
    </details>
  );
};

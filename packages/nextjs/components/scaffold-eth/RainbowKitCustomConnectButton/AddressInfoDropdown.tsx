import { useRef, useState } from "react";
import { NetworkOptions } from "./NetworkOptions";
import { getAddress } from "viem";
import { Address } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { BlockieAvatar, isENS } from "~~/components/scaffold-eth";
import { useCopyToClipboard, useOutsideClick } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const BURNER_WALLET_ID = "burnerWallet";

const allowedNetworks = getTargetNetworks();

type AddressInfoDropdownProps = {
  address: Address;
  blockExplorerAddressLink: string | undefined;
  displayName: string;
  ensAvatar?: string;
};

export const AddressInfoDropdown = ({
  address,
  ensAvatar,
  displayName,
  blockExplorerAddressLink,
}: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { connector } = useAccount();
  const checkSumAddress = getAddress(address);

  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <>
      <details ref={dropdownRef} className="relative group">
        <summary className="flex items-center gap-2 px-5 py-2 bg-[var(--color-secondary)] hover:opacity-90 text-black cursor-pointer transition-all duration-300 list-none hover:scale-105 active:scale-95">
          <BlockieAvatar address={checkSumAddress} size={30} ensImage={ensAvatar} />
          <span className="font-roboto text-sm font-medium">
            {isENS(displayName) ? displayName : checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4)}
          </span>
          <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <ul className="absolute right-0 mt-2 w-56 bg-black border border-[var(--color-secondary)]/30 shadow-lg z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <NetworkOptions hidden={!selectingNetwork} />
          <li className={`list-none ${selectingNetwork ? "hidden" : ""}`}>
            <button
              className="w-full flex items-center cursor-pointer gap-3 px-4 py-3 text-sm font-roboto text-white hover:bg-[var(--color-secondary)]/10 transition-all duration-200 active:scale-95"
              onClick={() => copyAddressToClipboard(checkSumAddress)}
            >
              {isAddressCopiedToClipboard ? (
                <>
                  <CheckCircleIcon
                    className="h-4 w-4 animate-in zoom-in duration-200 text-[var(--color-secondary)]"
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">Copied!</span>
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4 transition-transform duration-200" aria-hidden="true" />
                  <span className="whitespace-nowrap">Copy address</span>
                </>
              )}
            </button>
          </li>
          <li className={`list-none ${selectingNetwork ? "hidden" : ""}`}>
            <label
              htmlFor="qrcode-modal"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-white hover:bg-[var(--color-secondary)]/10 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <QrCodeIcon className="h-4 w-4 transition-transform duration-200" />
              <span className="whitespace-nowrap">View QR Code</span>
            </label>
          </li>
          <li className={`list-none ${selectingNetwork ? "hidden" : ""}`}>
            <a
              target="_blank"
              href={blockExplorerAddressLink}
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-white hover:bg-[var(--color-secondary)]/10 transition-all duration-200 active:scale-95"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4 transition-transform duration-200" />
              <span className="whitespace-nowrap">View on Block Explorer</span>
            </a>
          </li>
          {allowedNetworks.length > 1 ? (
            <li className={`list-none ${selectingNetwork ? "hidden" : ""}`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-white hover:bg-[var(--color-secondary)]/10 transition-all duration-200 active:scale-95"
                type="button"
                onClick={() => {
                  setSelectingNetwork(true);
                }}
              >
                <ArrowsRightLeftIcon className="h-4 w-4 transition-transform duration-200" />
                <span>Switch Network</span>
              </button>
            </li>
          ) : null}
          {connector?.id === BURNER_WALLET_ID ? (
            <li className="list-none">
              <label
                htmlFor="reveal-burner-pk-modal"
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-red-400 hover:bg-[var(--color-secondary)]/10 transition-all duration-200 cursor-pointer active:scale-95"
              >
                <EyeIcon className="h-4 w-4 transition-transform duration-200" />
                <span>Reveal Private Key</span>
              </label>
            </li>
          ) : null}
          <li className={`list-none ${selectingNetwork ? "hidden" : ""}`}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-red-400 hover:bg-[var(--color-secondary)]/10 transition-all duration-200 cursor-pointer"
              type="button"
              onClick={() => disconnect()}
            >
              <ArrowLeftOnRectangleIcon className="h-4 w-4 transition-transform duration-200" />
              <span>Disconnect</span>
            </button>
          </li>
        </ul>
      </details>
    </>
  );
};

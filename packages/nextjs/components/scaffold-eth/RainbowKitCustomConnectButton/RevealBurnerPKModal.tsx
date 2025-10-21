import { useRef } from "react";
import { rainbowkitBurnerWallet } from "burner-connector";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

export const RevealBurnerPKModal = () => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const modalCheckboxRef = useRef<HTMLInputElement>(null);

  const handleCopyPK = async () => {
    try {
      const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
      const burnerPK = storage?.getItem(BURNER_WALLET_PK_KEY);
      if (!burnerPK) throw new Error("Burner wallet private key not found");
      await copyToClipboard(burnerPK);
      notification.success("Burner wallet private key copied to clipboard");
    } catch (e) {
      const parsedError = getParsedError(e);
      notification.error(parsedError);
      if (modalCheckboxRef.current) modalCheckboxRef.current.checked = false;
    }
  };

  return (
    <>
      <div>
        <input type="checkbox" id="reveal-burner-pk-modal" className="hidden peer" ref={modalCheckboxRef} />
        <label
          htmlFor="reveal-burner-pk-modal"
          className="hidden peer-checked:block fixed inset-0 bg-black bg-opacity-75 z-50 cursor-pointer animate-in fade-in duration-300"
        >
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            onClick={e => {
              if (e.target === e.currentTarget && modalCheckboxRef.current) {
                modalCheckboxRef.current.checked = false;
              }
            }}
          >
            <div
              className="bg-gray-900 p-8 max-w-md w-full relative border border-[var(--color-secondary)]/30 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
              onClick={e => e.stopPropagation()}
            >
              <label
                htmlFor="reveal-burner-pk-modal"
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center hover:bg-[var(--color-secondary)]/10 cursor-pointer transition-all duration-200 text-white text-xl hover:rotate-90 active:scale-90"
              >
                ✕
              </label>
              <div className="space-y-4">
                <p className="text-xl font-roboto font-medium text-white animate-in fade-in slide-in-from-top-2 duration-500">
                  Copy Burner Wallet Private Key
                </p>
                <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-500 delay-100">
                  <ShieldExclamationIcon className="h-6 w-6 text-yellow-400 flex-shrink-0 animate-pulse" />
                  <span className="font-roboto text-yellow-100 text-sm">
                    Burner wallets are intended for local development only and are not safe for storing real funds.
                  </span>
                </div>
                <p className="text-gray-300 font-roboto text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 duration-500 delay-200">
                  Your Private Key provides <strong>full access</strong> to your entire wallet and funds. This is
                  currently stored <strong>temporarily</strong> in your browser.
                </p>
                <button
                  className="w-full px-4 py-3 bg-red-600 hover:opacity-90 text-white font-roboto font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-red-600/30 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300"
                  onClick={handleCopyPK}
                  disabled={isCopiedToClipboard}
                >
                  {isCopiedToClipboard ? "Copied!" : "Copy Private Key To Clipboard"}
                </button>
              </div>
            </div>
          </div>
        </label>
      </div>
    </>
  );
};

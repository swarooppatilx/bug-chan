import { QRCodeSVG } from "qrcode.react";
import { Address as AddressType } from "viem";
import { Address } from "~~/components/scaffold-eth";

type AddressQRCodeModalProps = {
  address: AddressType;
  modalId: string;
};

export const AddressQRCodeModal = ({ address, modalId }: AddressQRCodeModalProps) => {
  return (
    <>
      <div>
        <input type="checkbox" id={`${modalId}`} className="hidden peer" />
        <label
          htmlFor={`${modalId}`}
          className="hidden peer-checked:flex fixed h-screen w-screen inset-0 bg-black/75 z-[100] cursor-pointer items-center justify-center p-4 animate-in fade-in duration-300 transition-all"
        >
          <div
            className="w-full h-full flex items-center justify-center"
            onClick={e => {
              if (e.target === e.currentTarget) {
                const checkbox = document.getElementById(`${modalId}`) as HTMLInputElement;
                if (checkbox) checkbox.checked = false;
              }
            }}
          >
            <div
              className="bg-gray-900 p-8 max-w-lg w-full mx-auto relative border border-[var(--color-secondary)]/30 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
              onClick={e => e.stopPropagation()}
            >
              <label
                htmlFor={`${modalId}`}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center hover:bg-[var(--color-secondary)]/10 cursor-pointer transition-all duration-200 text-white text-xl hover:rotate-90 active:scale-90"
              >
                ✕
              </label>
              <div className="space-y-6 py-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="animate-in zoom-in duration-500 delay-100">
                    <QRCodeSVG value={address} size={256} className="p-5 bg-white" />
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                    <Address address={address} format="long" disableAddressLink onlyEnsOrAddress />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </label>
      </div>
    </>
  );
};

import { useTheme } from "next-themes";
import { useAccount, useSwitchChain } from "wagmi";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import { getNetworkColor } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const allowedNetworks = getTargetNetworks();

type NetworkOptionsProps = {
  hidden?: boolean;
};

export const NetworkOptions = ({ hidden = false }: NetworkOptionsProps) => {
  const { switchChain } = useSwitchChain();
  const { chain } = useAccount();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  return (
    <>
      {allowedNetworks
        .filter(allowedNetwork => allowedNetwork.id !== chain?.id)
        .map(allowedNetwork => (
          <li key={allowedNetwork.id} className={`list-none ${hidden ? "hidden" : ""}`}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-white hover:bg-[var(--color-secondary)]/10 transition-all duration-200 hover:translate-x-1 active:scale-95"
              type="button"
              onClick={() => {
                switchChain?.({ chainId: allowedNetwork.id });
              }}
            >
              <ArrowsRightLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              <span>
                Switch to{" "}
                <span
                  style={{
                    color: getNetworkColor(allowedNetwork, isDarkMode),
                  }}
                >
                  {allowedNetwork.name}
                </span>
              </span>
            </button>
          </li>
        ))}
    </>
  );
};

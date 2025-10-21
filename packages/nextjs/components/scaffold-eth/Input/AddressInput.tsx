import { useEffect, useState } from "react";
import { blo } from "blo";
import { useDebounceValue } from "usehooks-ts";
import { Address, isAddress } from "viem";
import { normalize } from "viem/ens";
import { useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { CommonInputProps, InputBase, isENS } from "~~/components/scaffold-eth";

/**
 * Address input with ENS name resolution
 */
export const AddressInput = ({ value, name, placeholder, onChange, disabled }: CommonInputProps<Address | string>) => {
  // Debounce the input to keep clean RPC calls when resolving ENS names
  // If the input is an address, we don't need to debounce it
  const [_debouncedValue] = useDebounceValue(value, 500);
  const debouncedValue = isAddress(value) ? value : _debouncedValue;
  const isDebouncedValueLive = debouncedValue === value;

  // If the user changes the input after an ENS name is already resolved, we want to remove the stale result
  const settledValue = isDebouncedValueLive ? debouncedValue : undefined;

  const {
    data: ensAddress,
    isLoading: isEnsAddressLoading,
    isError: isEnsAddressError,
  } = useEnsAddress({
    name: settledValue,
    chainId: 1,
    query: {
      gcTime: 30_000,
      enabled: isDebouncedValueLive && isENS(debouncedValue),
    },
  });

  const [enteredEnsName, setEnteredEnsName] = useState<string>();
  const {
    data: ensName,
    isLoading: isEnsNameLoading,
    isError: isEnsNameError,
  } = useEnsName({
    address: settledValue as Address,
    chainId: 1,
    query: {
      enabled: isAddress(debouncedValue),
      gcTime: 30_000,
    },
  });

  const { data: ensAvatar, isLoading: isEnsAvatarLoading } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: 1,
    query: {
      enabled: Boolean(ensName),
      gcTime: 30_000,
    },
  });

  // ens => address
  useEffect(() => {
    if (!ensAddress) return;

    // ENS resolved successfully
    setEnteredEnsName(debouncedValue);
    onChange(ensAddress);
  }, [ensAddress, onChange, debouncedValue]);

  useEffect(() => {
    setEnteredEnsName(undefined);
  }, [value]);

  const reFocus = isEnsAddressError || isEnsNameError || ensName === null || ensAddress === null;

  return (
    <InputBase<Address>
      name={name}
      placeholder={placeholder}
      error={ensAddress === null}
      value={value as Address}
      onChange={onChange}
      disabled={isEnsAddressLoading || isEnsNameLoading || disabled}
      reFocus={reFocus}
      prefix={
        ensName ? (
          <div className="flex bg-gray-800 items-center border-r border-gray-700">
            {isEnsAvatarLoading && <div className="w-[35px] h-[35px] bg-gray-700 animate-pulse shrink-0"></div>}
            {ensAvatar ? (
              <span className="w-[35px]">
                {
                  // eslint-disable-next-line
                  <img className="w-full" src={ensAvatar} alt={`${ensAddress} avatar`} />
                }
              </span>
            ) : null}
            <span className="text-[var(--color-secondary)] px-2 font-roboto text-sm">{enteredEnsName ?? ensName}</span>
          </div>
        ) : (
          (isEnsNameLoading || isEnsAddressLoading) && (
            <div className="flex bg-gray-800 items-center gap-2 pr-2 border-r border-gray-700">
              <div className="w-[35px] h-[35px] bg-gray-700 animate-pulse shrink-0"></div>
              <div className="h-3 w-20 bg-gray-700 animate-pulse"></div>
            </div>
          )
        )
      }
      suffix={
        // Don't want to use nextJS Image here (and adding remote patterns for the URL)
        // eslint-disable-next-line @next/next/no-img-element
        value && <img alt="" className="" src={blo(value as `0x${string}`)} width="35" height="35" />
      }
    />
  );
};

import { useMemo, useState } from "react";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { CommonInputProps, InputBase, SIGNED_NUMBER_REGEX } from "~~/components/scaffold-eth";
import { useDisplayUsdMode } from "~~/hooks/scaffold-eth/useDisplayUsdMode";
import { useGlobalState } from "~~/services/store/store";

const MAX_DECIMALS_USD = 2;

function etherValueToDisplayValue(usdMode: boolean, etherValue: string, nativeCurrencyPrice: number) {
  if (usdMode && nativeCurrencyPrice) {
    const parsedEthValue = parseFloat(etherValue);
    if (Number.isNaN(parsedEthValue)) {
      return etherValue;
    } else {
      // We need to round the value rather than use toFixed,
      // since otherwise a user would not be able to modify the decimal value
      return (
        Math.round(parsedEthValue * nativeCurrencyPrice * 10 ** MAX_DECIMALS_USD) /
        10 ** MAX_DECIMALS_USD
      ).toString();
    }
  } else {
    return etherValue;
  }
}

function displayValueToEtherValue(usdMode: boolean, displayValue: string, nativeCurrencyPrice: number) {
  if (usdMode && nativeCurrencyPrice) {
    const parsedDisplayValue = parseFloat(displayValue);
    if (Number.isNaN(parsedDisplayValue)) {
      // Invalid number.
      return displayValue;
    } else {
      // Compute the ETH value if a valid number.
      return (parsedDisplayValue / nativeCurrencyPrice).toString();
    }
  } else {
    return displayValue;
  }
}

/**
 * Input for ETH amount with USD conversion.
 *
 * onChange will always be called with the value in ETH
 */
export const EtherInput = ({
  value,
  name,
  placeholder,
  onChange,
  disabled,
  usdMode,
}: CommonInputProps & { usdMode?: boolean }) => {
  const [transitoryDisplayValue, setTransitoryDisplayValue] = useState<string>();
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const isNativeCurrencyPriceFetching = useGlobalState(state => state.nativeCurrency.isFetching);

  const { displayUsdMode, toggleDisplayUsdMode } = useDisplayUsdMode({ defaultUsdMode: usdMode });

  // The displayValue is derived from the ether value that is controlled outside of the component
  // In usdMode, it is converted to its usd value, in regular mode it is unaltered
  const displayValue = useMemo(() => {
    const newDisplayValue = etherValueToDisplayValue(displayUsdMode, value, nativeCurrencyPrice || 0);
    if (transitoryDisplayValue && parseFloat(newDisplayValue) === parseFloat(transitoryDisplayValue)) {
      return transitoryDisplayValue;
    }
    // Clear any transitory display values that might be set
    setTransitoryDisplayValue(undefined);
    return newDisplayValue;
  }, [nativeCurrencyPrice, transitoryDisplayValue, displayUsdMode, value]);

  const handleChangeNumber = (newValue: string) => {
    if (newValue && !SIGNED_NUMBER_REGEX.test(newValue)) {
      return;
    }

    // Following condition is a fix to prevent usdMode from experiencing different display values
    // than what the user entered. This can happen due to floating point rounding errors that are introduced in the back and forth conversion
    if (displayUsdMode) {
      const decimals = newValue.split(".")[1];
      if (decimals && decimals.length > MAX_DECIMALS_USD) {
        return;
      }
    }

    // Since the display value is a derived state (calculated from the ether value), usdMode would not allow introducing a decimal point.
    // This condition handles a transitory state for a display value with a trailing decimal sign
    if (newValue.endsWith(".") || newValue.endsWith(".0")) {
      setTransitoryDisplayValue(newValue);
    } else {
      setTransitoryDisplayValue(undefined);
    }

    const newEthValue = displayValueToEtherValue(displayUsdMode, newValue, nativeCurrencyPrice || 0);
    onChange(newEthValue);
  };

  return (
    <InputBase
      name={name}
      value={displayValue}
      placeholder={placeholder}
      onChange={handleChangeNumber}
      disabled={disabled}
      prefix={
        <span className="pl-4 -mr-2 text-[var(--color-secondary)] self-center font-roboto">
          {displayUsdMode ? "$" : "Ξ"}
        </span>
      }
      suffix={
        <div className={`${nativeCurrencyPrice > 0 ? "" : "relative group"}`}>
          {nativeCurrencyPrice <= 0 && (
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 border border-gray-700 text-white text-xs font-roboto whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {isNativeCurrencyPriceFetching ? "Fetching price" : "Unable to fetch price"}
            </div>
          )}
          <button
            className="px-3 h-full bg-[var(--color-primary)] hover:opacity-90 text-white font-roboto transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={toggleDisplayUsdMode}
            disabled={!displayUsdMode && !nativeCurrencyPrice}
            type="button"
          >
            <ArrowsRightLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      }
    />
  );
};

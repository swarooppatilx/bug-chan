import { formatEther } from "viem";

/**
 * Short ETH formatter that trims to fractionDigits and strips trailing zeros.
 * Example: 0.025418709695 -> 0.0254187 (fractionDigits=7)
 */
export function formatEthShort(value: bigint, fractionDigits = 6): string {
  const s = formatEther(value);
  const [intPart, frac = ""] = s.split(".");
  if (!frac) return intPart;
  const trimmed = frac.slice(0, Math.max(0, fractionDigits)).replace(/0+$/, "");
  return trimmed.length ? `${intPart}.${trimmed}` : intPart;
}

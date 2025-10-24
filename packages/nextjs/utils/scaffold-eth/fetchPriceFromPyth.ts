import { ChainWithAttributes, getAlchemyHttpUrl } from "./networks";
import { HermesClient } from "@pythnetwork/hermes-client";
import { ethers } from "ethers";
import { Address, createPublicClient, fallback, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";

const ETH_FEED_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD feed ID
const PYTH_CONTRACT_ADDRESS = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"; // Sepolia contract

const HERMES_BASE_URL = "https://hermes.pyth.network";

const PYTH_ABI = parseAbi([
  "function getUpdateFee(bytes[] calldata updateData) external view returns (uint fee)",
  "function updatePriceFeeds(bytes[] calldata updateData) external payable",
  "function getPrice(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint256 publishTime)",
  "function getPriceUnsafe(bytes32 id) external view returns (int64 price, uint64 conf, int32 expo, uint256 publishTime)",
]);

const alchemyHttpUrl = getAlchemyHttpUrl(sepolia.id);
const rpcFallbacks = alchemyHttpUrl ? [http(alchemyHttpUrl), http()] : [http()];
const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback(rpcFallbacks),
});

const normalizeHex = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  return v.toLowerCase().replace(/^0x/, "");
};

export const fetchPriceFromPyth = async (targetNetwork: ChainWithAttributes): Promise<number> => {
  if (targetNetwork.id !== sepolia.id) {
    console.warn("[price] fetchPriceFromPyth - Only supports Sepolia ETH/USD");
    return 0;
  }

  const reasons: string[] = [];
  const hermes = new HermesClient(HERMES_BASE_URL);

  const b64ToBytes = (b64: string): Uint8Array => {
    const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  // --- Method 1: On-chain pull
  try {
    if (typeof window === "undefined" || !window.ethereum) throw new Error("No wallet detected");
    const provider = new (await import("ethers")).ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new (await import("ethers")).ethers.Contract(PYTH_CONTRACT_ADDRESS, PYTH_ABI, signer);
    let updateData: Uint8Array[] = [];
    try {
      const latest = await hermes.getLatestPriceUpdates({ ids: [ETH_FEED_ID], encoding: "hex" } as any);
      const hexList: string[] = Array.isArray((latest as any)?.binary?.data) ? (latest as any).binary.data : [];
      if (hexList.length > 0) updateData = hexList.map(h => ethers.getBytes(h.startsWith("0x") ? h : `0x${h}`));
    } catch {}
    if (updateData.length === 0) {
      try {
        const vaas: string[] = await (hermes as any).getLatestVaas([ETH_FEED_ID]);
        if (Array.isArray(vaas) && vaas.length > 0) updateData = vaas.map(v => b64ToBytes(v));
      } catch {}
    }
    if (updateData.length === 0) throw new Error("No update data from Hermes SDK");

    const fee = await contract.getUpdateFee(updateData);
    const tx = await contract.updatePriceFeeds(updateData, { value: fee });
    await tx.wait();

    const result = await contract.getPrice(ETH_FEED_ID);
    const computed = Number(result.price) * Math.pow(10, Number(result.expo));
    if (isFinite(computed) && computed > 0) {
      console.info(`[price] ✓ On-chain Pull: ETH/USD = $${computed.toFixed(2)}`);
      return computed;
    }
    reasons.push(`On-chain invalid result`);
  } catch (err) {
    reasons.push(`On-chain pull failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Method 2: On-chain read
  try {
    const data = await publicClient.readContract({
      address: PYTH_CONTRACT_ADDRESS as Address,
      abi: PYTH_ABI,
      functionName: "getPriceUnsafe",
      args: [ETH_FEED_ID as `0x${string}`],
    });

    const [price, , expo] = data;
    const computed = Number(price) * Math.pow(10, Number(expo));
    if (isFinite(computed) && computed > 0) {
      console.info(`[price] ✓ On-chain Read: ETH/USD = $${computed.toFixed(2)}`);
      return computed;
    }
    reasons.push(`Unsafe read invalid`);
  } catch (err) {
    reasons.push(`Unsafe read error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Method 3: Hermes SDK ---
  try {
    const latestParsed: any = await hermes.getLatestPriceUpdates([ETH_FEED_ID] as any);
    const parsed = Array.isArray(latestParsed?.parsed)
      ? latestParsed.parsed
      : Array.isArray((latestParsed as any)?.price_feeds)
        ? (latestParsed as any).price_feeds
        : [];
    const feed = parsed.find((p: any) => normalizeHex(p.id) === normalizeHex(ETH_FEED_ID));
    const priceObj = feed?.price ?? feed?.ema_price;
    if (priceObj) {
      const computed = Number(priceObj.price) * Math.pow(10, Number(priceObj.expo));
      if (isFinite(computed) && computed > 0) {
        console.info(`[price] ✓ Hermes SDK: ETH/USD = $${computed.toFixed(2)}`);
        return computed;
      }
    }
    reasons.push(`Hermes SDK parsed: no valid data`);
  } catch (err) {
    reasons.push(`Hermes SDK error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Method 4: Legacy HTTP fallbacks (v1/v2) ---
  try {
    const v2Url = `${HERMES_BASE_URL}/v2/updates/price/latest?ids[]=${ETH_FEED_ID}`;
    const res2 = await fetch(v2Url);
    if (res2.ok) {
      const data = await res2.json();
      const parsed = Array.isArray(data.parsed) ? data.parsed : Array.isArray(data.price_feeds) ? data.price_feeds : [];
      const feed = parsed.find((p: any) => normalizeHex(p.id) === normalizeHex(ETH_FEED_ID));
      const priceObj = feed?.price ?? feed?.ema_price;
      if (priceObj) {
        const computed = Number(priceObj.price) * Math.pow(10, Number(priceObj.expo));
        if (isFinite(computed) && computed > 0) {
          console.info(`[price] ✓ Hermes v2 HTTP: ETH/USD = $${computed.toFixed(2)}`);
          return computed;
        }
      }
    }
    const v1Url = `${HERMES_BASE_URL}/api/latest_price_feeds?ids[]=${ETH_FEED_ID}`;
    const res1 = await fetch(v1Url);
    if (res1.ok) {
      const data = await res1.json();
      const feed = data.find((d: any) => normalizeHex(d.id) === normalizeHex(ETH_FEED_ID));
      const priceObj = feed?.price;
      if (priceObj) {
        const computed = Number(priceObj.price) * Math.pow(10, Number(priceObj.expo));
        if (isFinite(computed) && computed > 0) {
          console.info(`[price] ✓ Hermes v1 HTTP: ETH/USD = $${computed.toFixed(2)}`);
          return computed;
        }
      }
      reasons.push(`v1: no valid data`);
    } else {
      reasons.push(`v1 HTTP ${res1.status}`);
    }
  } catch (err) {
    reasons.push(`HTTP fallback error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.error(`[price] All Pyth methods failed. Reasons: ${reasons.join(" | ")}`);
  return 0;
};

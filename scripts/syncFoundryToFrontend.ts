import fs from "fs";
import path from "path";

// Paths
const foundryOut = path.resolve("packages/foundry/out");
const broadcastDir = path.resolve("packages/foundry/broadcast/BountyFactory.s.sol/31337/run-latest.json");
const frontendContracts = path.resolve("packages/nextjs/contracts");

// Get ABI
const bountyFactoryAbi = JSON.parse(
  fs.readFileSync(path.join(foundryOut, "BountyFactory.sol/BountyFactory.json"), "utf-8")
).abi;

// Get deployed address
const broadcast = JSON.parse(fs.readFileSync(broadcastDir, "utf-8"));
const address = broadcast.transactions.find((tx: any) => tx.contractName === "BountyFactory")?.contractAddress;

// Write ABI and address to frontend
fs.writeFileSync(
  path.join(frontendContracts, "BountyFactoryABI.json"),
  JSON.stringify(bountyFactoryAbi, null, 2)
);

fs.writeFileSync(
  path.join(frontendContracts, "BountyFactoryAddress.json"),
  JSON.stringify({ address }, null, 2)
);

console.log("Synced ABI and address to frontend.");

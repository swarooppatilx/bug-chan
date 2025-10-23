import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("BountyFactory", {
      account: deployer,
      artifact: artifacts.BountyFactory,
      // Pass the platform treasury address (using deployer by default)
      args: [deployer],
    });
  },
  // finally you can pass tags and dependencies
  { tags: ["BountyFactory"] },
);

import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("BountyFactory", {
      account: deployer,
      artifact: artifacts.BountyFactory,
      args: [],
    });
  },
  // finally you can pass tags and dependencies
  { tags: ["BountyFactory"] },
);

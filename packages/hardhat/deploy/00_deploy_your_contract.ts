import { deployScript, artifacts } from "#rocketh";
// const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
//   const { deployer } = await hre.getNamedAccounts();
//   const { deploy } = hre.deployments;

//   // We only deploy the factory. The factory will then deploy Bounty contracts.
//   await deploy("BountyFactory", {
//     from: deployer,
//     args: [],
//     log: true,
//     autoMine: true,
//   });
// };

// export default func;
// func.tags = ["BountyFactory"];
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

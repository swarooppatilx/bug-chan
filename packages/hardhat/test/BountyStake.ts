import { expect } from "chai";
import { ethers } from "hardhat";

describe("Bounty staking flow", function () {
  it("requires min stake and slashes on rejection", async function () {
    const [owner, researcher] = await ethers.getSigners();

    // Deploy factory and create a bounty with 1 ETH reward
    const Factory = await ethers.getContractFactory("BountyFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    const bountyCid = "bafy-test-bounty";
    const reward = ethers.parseEther("1");
    const tx = await factory.createBounty(owner.address, bountyCid, { value: reward });
    const receipt = await tx.wait();
    const event = receipt!.logs.find(l => (l as any).fragment?.name === "BountyCreated") as any;
    const bountyAddress: string = event?.args?.bountyAddress;
    const bounty = await ethers.getContractAt("Bounty", bountyAddress);

    // Check default minStake
    const minStake = await bounty.minStake();
    expect(minStake).to.be.gt(0n);

    // Submitting below minStake should revert
    await expect(bounty.connect(researcher).submitReport("bafy-report", { value: minStake - 1n })).to.be.revertedWith(
      "Insufficient stake",
    );

    // Successful submission with minStake
    const submitTx = await bounty.connect(researcher).submitReport("bafy-report", { value: minStake });
    await submitTx.wait();
    expect(await bounty.status()).to.equal(1); // Submitted
    expect(await bounty.stakedAmount()).to.equal(minStake);

    // On rejection, stake should be transferred to owner
    const ownerBalBefore = await ethers.provider.getBalance(owner.address);
    const rejectTx = await bounty.connect(owner).rejectSubmission();
    const rejectRcpt = await rejectTx.wait();
    const gasUsed = rejectRcpt!.gasUsed * rejectTx.gasPrice!;
    const ownerBalAfter = await ethers.provider.getBalance(owner.address);
    // owner balance increases roughly by minStake minus gas. We can't assert exact due to gas, so check >= minStake - small delta
    expect(ownerBalAfter + gasUsed - ownerBalBefore).to.equal(minStake);
    expect(await bounty.stakedAmount()).to.equal(0n);
    expect(await bounty.status()).to.equal(3); // Rejected
  });
});

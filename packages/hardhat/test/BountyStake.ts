import { expect } from "chai";
import { network } from "hardhat";

describe("Bounty lifecycle: submissions, accept/reject, close/settle", function () {
  it("supports fixed stake, one submission per wallet, slashed stakes added to pool, and reward split on close", async function () {
    const { ethers } = await network.connect();
    const [owner, researcher1, researcher2] = await ethers.getSigners();

    // Deploy factory (no platform treasury)
    const Factory = await ethers.getContractFactory("BountyFactory");
    const factory = await (Factory.connect(owner) as any).deploy();
    await factory.waitForDeployment();

    const bountyCid = "bafy-test-bounty";
    const reward = ethers.parseEther("1");
    const fixedStake = ethers.parseEther("0.02");
    const duration = 7n * 24n * 60n * 60n; // 7 days

    const tx = await factory
      .connect(owner)
      .createBounty(owner.address, bountyCid, fixedStake, duration, { value: reward });
    const receipt = await tx.wait();
    const event = receipt!.logs.find((l: any) => (l as any).fragment?.name === "BountyCreated") as any;
    const bountyAddress: string = event?.args?.bountyAddress;
    const bounty = await ethers.getContractAt("Bounty", bountyAddress);

    expect(await bounty.stakeAmount()).to.equal(fixedStake);
    expect(await bounty.status()).to.equal(0); // Open

    // Wrong stake should revert
    await expect(bounty.connect(researcher1).submitReport("cid-1", { value: fixedStake - 1n })).to.be.revertedWith(
      "Stake must equal fixed amount",
    );

    // First researcher submits
    await (await bounty.connect(researcher1).submitReport("cid-1", { value: fixedStake })).wait();

    // Same wallet cannot submit twice
    await expect(bounty.connect(researcher1).submitReport("cid-1b", { value: fixedStake })).to.be.revertedWith(
      "Already submitted from this wallet",
    );

    // Second researcher also submits
    await (await bounty.connect(researcher2).submitReport("cid-2", { value: fixedStake })).wait();

    // Accept first, reject second; both stakes should be slashed to the creator (not added to pool)
    await (await bounty.connect(owner).acceptSubmission(researcher1.address)).wait();
    await (await bounty.connect(owner).rejectSubmission(researcher2.address)).wait();
    // The on-chain reward pool should still equal the original bounty amount (no stake added)
    expect(await bounty.amount()).to.equal(reward);

    // Close bounty and settle rewards
    await (await bounty.connect(owner).close()).wait();
    expect(await bounty.status()).to.equal(1); // Closed

    // With one accepted winner, entire bounty reward should be paid out to researcher1; contract should be emptied
    const contractBal = await ethers.provider.getBalance(bountyAddress);
    expect(contractBal).to.equal(0n);

    const [, , s1] = await bounty.getSubmission(researcher1.address);
    expect(s1).to.equal(2); // Accepted
    const [, , s2] = await bounty.getSubmission(researcher2.address);
    expect(s2).to.equal(3); // Rejected
  });

  it("allows anyone to close after expiry and refunds untouched submissions", async function () {
    const { ethers } = await network.connect();
    const [owner, researcher1, other] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BountyFactory");
    const factory = await (Factory.connect(owner) as any).deploy();
    await factory.waitForDeployment();

    const reward = ethers.parseEther("0.5");
    const fixedStake = ethers.parseEther("0.01");
    const short = 1n; // 1 second

    const tx = await factory.connect(owner).createBounty(owner.address, "cid-short", fixedStake, short, {
      value: reward,
    });
    const rc = await tx.wait();
    const ev = rc!.logs.find((l: any) => (l as any).fragment?.name === "BountyCreated") as any;
    const bounty = await ethers.getContractAt("Bounty", ev!.args!.bountyAddress);

    // Submit once, but do not accept/reject before expiry
    await (await bounty.connect(researcher1).submitReport("cid-r1", { value: fixedStake })).wait();

    // advance time beyond endTime
    const endTime = await bounty.endTime();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Anyone (not owner) can close after expiry; stake should be refunded
    const balBefore = await ethers.provider.getBalance(researcher1.address);
    await (await bounty.connect(other).closeIfExpired()).wait();
    expect(await bounty.status()).to.equal(1); // Closed
    const balAfter = await ethers.provider.getBalance(researcher1.address);
    expect(balAfter).to.be.greaterThan(balBefore); // received refunded stake
  });
});

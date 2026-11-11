import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syntheticAddress } from "@rome-protocol/sdk";
import { Keypair } from "@solana/web3.js";
import { bytesToHex, getAddress, parseEther, type Address, type Hex } from "viem";
import { network } from "hardhat";

const HOUR = 60 * 60;

describe("Comitia", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const [creator, evmVoter, otherVoter] = await viem.getWalletClients();

  async function deploy() {
    return viem.deployContract("Comitia");
  }
  type Comitia = Awaited<ReturnType<typeof deploy>>;

  async function write(
    contract: Comitia,
    from: Address,
    functionName: string,
    args: readonly unknown[] = [],
  ) {
    const wallet = await viem.getWalletClient(from);
    const hash = await wallet.writeContract({
      address: contract.address,
      abi: contract.abi,
      functionName,
      args,
    } as never);
    return publicClient.waitForTransactionReceipt({ hash });
  }

  async function solanaSigner() {
    const keypair = Keypair.generate();
    const pubkey = bytesToHex(keypair.publicKey.toBytes()) as Hex;
    const address = getAddress(syntheticAddress(keypair.publicKey));
    await testClient.impersonateAccount({ address });
    await testClient.setBalance({ address, value: parseEther("10") });
    return { pubkey, address };
  }

  async function createPoll(contract: Comitia, options = ["Yes", "No"], duration = 24 * HOUR) {
    await write(contract, creator.account.address, "createPoll", [
      "Ship cross-VM governance?",
      "Both wallet ecosystems vote in one poll.",
      options,
      BigInt(duration),
    ]);
  }

  type PollView = {
    question: string;
    options: readonly string[];
    evmVotes: readonly number[];
    solanaVotes: readonly number[];
    evmVoters: number;
    solanaVoters: number;
    endsAt: bigint;
    createdAt: bigint;
  };

  it("creates a poll with bounded inputs", async () => {
    const comitia = await deploy();
    await createPoll(comitia, ["A", "B", "C"]);
    const poll = (await comitia.read.getPoll([1n])) as PollView;
    assert.equal(await comitia.read.pollCount(), 1n);
    assert.equal(poll.question, "Ship cross-VM governance?");
    assert.deepEqual(poll.options, ["A", "B", "C"]);
    assert.equal(poll.endsAt - poll.createdAt, BigInt(24 * HOUR));

    const bad: [unknown[], RegExp][] = [
      [["", "", ["A", "B"], BigInt(HOUR)], /EmptyValue|reverted/],
      [["x".repeat(201), "", ["A", "B"], BigInt(HOUR)], /TextTooLong|reverted/],
      [["Q", "", ["A"], BigInt(HOUR)], /InvalidOptionCount|reverted/],
      [["Q", "", ["1", "2", "3", "4", "5", "6", "7"], BigInt(HOUR)], /InvalidOptionCount|reverted/],
      [["Q", "", ["A", ""], BigInt(HOUR)], /EmptyValue|reverted/],
      [["Q", "", ["A", "x".repeat(65)], BigInt(HOUR)], /TextTooLong|reverted/],
      [["Q", "", ["A", "B"], BigInt(HOUR - 1)], /InvalidDuration|reverted/],
      [["Q", "", ["A", "B"], BigInt(30 * 24 * HOUR + 1)], /InvalidDuration|reverted/],
    ];
    for (const [args, pattern] of bad) {
      await assert.rejects(() => write(comitia, creator.account.address, "createPoll", args), pattern);
    }
  });

  it("counts EVM votes and blocks double voting", async () => {
    const comitia = await deploy();
    await createPoll(comitia);
    await write(comitia, evmVoter.account.address, "vote", [1n, 0]);
    await write(comitia, otherVoter.account.address, "vote", [1n, 1]);
    await assert.rejects(
      () => write(comitia, evmVoter.account.address, "vote", [1n, 1]),
      /AlreadyVoted|reverted/,
    );
    await assert.rejects(
      () => write(comitia, creator.account.address, "vote", [1n, 2]),
      /InvalidOption|reverted/,
    );

    const poll = (await comitia.read.getPoll([1n])) as PollView;
    assert.deepEqual(poll.evmVotes, [1, 1]);
    assert.deepEqual(poll.solanaVotes, [0, 0]);
    assert.equal(poll.evmVoters, 2);
    const ballot = (await comitia.read.ballotOf([1n, evmVoter.account.address])) as {
      cast: boolean;
      solana: boolean;
      option: number;
    };
    assert.deepEqual(ballot, { cast: true, solana: false, option: 0 });
  });

  it("proves Solana votes from the Rome synthetic address", async () => {
    const comitia = await deploy();
    await createPoll(comitia);
    const signer = await solanaSigner();

    assert.equal(
      getAddress((await comitia.read.syntheticAddressOf([signer.pubkey])) as Address),
      signer.address,
    );
    await write(comitia, signer.address, "voteAsSolana", [1n, 1, signer.pubkey]);

    const poll = (await comitia.read.getPoll([1n])) as PollView;
    assert.deepEqual(poll.solanaVotes, [0, 1]);
    assert.equal(poll.solanaVoters, 1);
    assert.equal(poll.evmVoters, 0);
    await assert.rejects(
      () => write(comitia, signer.address, "voteAsSolana", [1n, 0, signer.pubkey]),
      /AlreadyVoted|reverted/,
    );
  });

  it("rejects Solana claims that do not match the caller", async () => {
    const comitia = await deploy();
    await createPoll(comitia);
    const signer = await solanaSigner();
    const other = await solanaSigner();

    await assert.rejects(
      () => write(comitia, evmVoter.account.address, "voteAsSolana", [1n, 0, signer.pubkey]),
      /NotSolanaSigner|reverted/,
    );
    await assert.rejects(
      () => write(comitia, signer.address, "voteAsSolana", [1n, 0, other.pubkey]),
      /NotSolanaSigner|reverted/,
    );
  });

  it("closes voting at the deadline", async () => {
    const comitia = await deploy();
    await createPoll(comitia, ["Yes", "No"], HOUR);
    await testClient.increaseTime({ seconds: HOUR });
    await testClient.mine({ blocks: 1 });
    await assert.rejects(
      () => write(comitia, evmVoter.account.address, "vote", [1n, 0]),
      /PollClosed|reverted/,
    );
    await assert.rejects(() => comitia.read.getPoll([2n]), /PollNotFound|reverted/);
  });

  it("pages polls newest first", async () => {
    const comitia = await deploy();
    for (let index = 0; index < 3; index++) await createPoll(comitia);
    const ids = async (offset: bigint, limit: bigint) =>
      ((await comitia.read.getPolls([offset, limit])) as readonly { id: bigint }[]).map(
        (poll) => poll.id,
      );

    assert.deepEqual(await ids(0n, 2n), [3n, 2n]);
    assert.deepEqual(await ids(2n, 2n), [1n]);
    assert.deepEqual(await ids(3n, 2n), []);
    await assert.rejects(() => comitia.read.getPolls([0n, 26n]), /LimitTooLarge|reverted/);
  });
});

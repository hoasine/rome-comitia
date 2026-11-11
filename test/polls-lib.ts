import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syntheticAddress } from "@rome-protocol/sdk";
import { Keypair } from "@solana/web3.js";
import { getAddress, keccak256 } from "viem";
import {
  leadingOption,
  optionShare,
  solanaPubkeyHex,
  timeRemaining,
  validatePollInput,
} from "../lib/polls";
import { toPoll } from "../lib/contract";
import type { Poll } from "../lib/types";

function poll(votes: [number, number][]): Poll {
  return {
    id: 1n,
    creator: "0x0000000000000000000000000000000000000001",
    question: "Q",
    description: "",
    options: votes.map(([evmVotes, solanaVotes], index) => ({
      label: `Option ${index}`,
      evmVotes,
      solanaVotes,
    })),
    createdAt: 0,
    endsAt: 100,
    evmVoters: 0,
    solanaVoters: 0,
  };
}

describe("poll helpers", () => {
  it("encodes the Solana pubkey that Rome derives the voter from", () => {
    const keypair = Keypair.generate();
    const pubkey = solanaPubkeyHex(keypair.publicKey.toBase58());
    assert.equal(pubkey.length, 66);
    assert.equal(
      getAddress(`0x${keccak256(pubkey).slice(-40)}`),
      getAddress(syntheticAddress(keypair.publicKey)),
    );
  });

  it("validates poll input against on-chain byte limits", () => {
    assert.equal(validatePollInput("Q?", "", ["A", "B"]), null);
    assert.match(validatePollInput("", "", ["A", "B"]) ?? "", /Ask/);
    assert.match(validatePollInput("Q", "", ["A", ""]) ?? "", /at least 2/);
    assert.match(validatePollInput("Q", "", ["A", "a"]) ?? "", /different/);
    assert.match(validatePollInput("Q", "", ["1", "2", "3", "4", "5", "6", "7"]) ?? "", /at most 6/);
    assert.match(validatePollInput("Đ".repeat(101), "", ["A", "B"]) ?? "", /200-byte/);
  });

  it("reports shares, leaders, and remaining time", () => {
    assert.equal(optionShare(1, 3), 33.3);
    assert.equal(optionShare(0, 0), 0);
    assert.equal(leadingOption(poll([[2, 1], [1, 1]])), 0);
    assert.equal(leadingOption(poll([[1, 1], [2, 0]])), -1);
    assert.equal(leadingOption(poll([[0, 0], [0, 0]])), -1);
    assert.equal(timeRemaining(100, 100), "Closed");
    assert.equal(timeRemaining(100 + 2 * 86400 + 3600, 100), "2d 1h left");
    assert.equal(timeRemaining(100 + 90, 100), "1m left");
    assert.equal(timeRemaining(100 + 90 * 86400, 100), "Open");
  });

  it("maps contract poll views", () => {
    const mapped = toPoll({
      id: 4n,
      creator: "0x0000000000000000000000000000000000000002",
      question: "Q",
      description: "D",
      options: ["Yes", "No"],
      evmVotes: [3, 1],
      solanaVotes: [2, 5],
      createdAt: 10n,
      endsAt: 20n,
      evmVoters: 4,
      solanaVoters: 7,
    });
    assert.deepEqual(mapped.options[1], { label: "No", evmVotes: 1, solanaVotes: 5 });
    assert.equal(mapped.endsAt, 20);
  });
});

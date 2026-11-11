import { createPublicClient, encodeFunctionData, http, type Address, type Hex } from "viem";
import { comitiaAbi } from "./abi";
import { COMITIA_ADDRESS, hadrian } from "./config";
import type { Ballot, Poll } from "./types";

export const publicClient = createPublicClient({
  chain: hadrian,
  transport: http(),
});

export const PAGE_SIZE = 25;

type RawPoll = {
  id: bigint;
  creator: Address;
  question: string;
  description: string;
  options: readonly string[];
  evmVotes: readonly number[];
  solanaVotes: readonly number[];
  createdAt: bigint;
  endsAt: bigint;
  evmVoters: number;
  solanaVoters: number;
};

function requireContract() {
  if (!COMITIA_ADDRESS) {
    throw new Error("Comitia is running in preview mode. Configure NEXT_PUBLIC_COMITIA_ADDRESS.");
  }
  return COMITIA_ADDRESS;
}

export function toPoll(raw: RawPoll): Poll {
  return {
    id: raw.id,
    creator: raw.creator,
    question: raw.question,
    description: raw.description,
    options: raw.options.map((label, index) => ({
      label,
      evmVotes: Number(raw.evmVotes[index] ?? 0),
      solanaVotes: Number(raw.solanaVotes[index] ?? 0),
    })),
    createdAt: Number(raw.createdAt),
    endsAt: Number(raw.endsAt),
    evmVoters: Number(raw.evmVoters),
    solanaVoters: Number(raw.solanaVoters),
  };
}

export async function loadPolls(offset = 0): Promise<Poll[]> {
  const raw = await publicClient.readContract({
    address: requireContract(),
    abi: comitiaAbi,
    functionName: "getPolls",
    args: [BigInt(offset), BigInt(PAGE_SIZE)],
  });
  return raw.map(toPoll);
}

export async function loadPoll(id: bigint): Promise<Poll> {
  const raw = await publicClient.readContract({
    address: requireContract(),
    abi: comitiaAbi,
    functionName: "getPoll",
    args: [id],
  });
  return toPoll(raw);
}

export async function loadPollCount(): Promise<number> {
  const count = await publicClient.readContract({
    address: requireContract(),
    abi: comitiaAbi,
    functionName: "pollCount",
  });
  return Number(count);
}

export async function loadBallot(pollId: bigint, voter: Address): Promise<Ballot> {
  const raw = await publicClient.readContract({
    address: requireContract(),
    abi: comitiaAbi,
    functionName: "ballotOf",
    args: [pollId, voter],
  });
  return { cast: raw.cast, solana: raw.solana, option: Number(raw.option) };
}

export function encodeCreatePoll(
  question: string,
  description: string,
  options: string[],
  durationSeconds: number,
): Hex {
  return encodeFunctionData({
    abi: comitiaAbi,
    functionName: "createPoll",
    args: [question, description, options, BigInt(durationSeconds)],
  });
}

export function encodeVote(pollId: bigint, option: number, solanaPubkey?: Hex): Hex {
  return solanaPubkey
    ? encodeFunctionData({
        abi: comitiaAbi,
        functionName: "voteAsSolana",
        args: [pollId, option, solanaPubkey],
      })
    : encodeFunctionData({
        abi: comitiaAbi,
        functionName: "vote",
        args: [pollId, option],
      });
}

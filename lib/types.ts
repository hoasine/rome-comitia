import type { Address } from "viem";

export interface PollOption {
  label: string;
  evmVotes: number;
  solanaVotes: number;
}

export interface Poll {
  id: bigint;
  creator: Address;
  question: string;
  description: string;
  options: PollOption[];
  createdAt: number;
  endsAt: number;
  evmVoters: number;
  solanaVoters: number;
}

export interface Ballot {
  cast: boolean;
  solana: boolean;
  option: number;
}

export type TransactionState =
  | { status: "idle" }
  | { status: "preparing"; message: string }
  | { status: "signing"; message: string }
  | { status: "confirming"; message: string; hash?: `0x${string}` }
  | { status: "success"; message: string; hash?: `0x${string}` }
  | { status: "error"; message: string };

import { PublicKey } from "@solana/web3.js";
import { bytesToHex, type Hex } from "viem";
import type { Poll } from "./types";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const DURATIONS = [
  { label: "1 hour", seconds: 60 * 60 },
  { label: "1 day", seconds: 24 * 60 * 60 },
  { label: "3 days", seconds: 3 * 24 * 60 * 60 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60 },
  { label: "30 days", seconds: 30 * 24 * 60 * 60 },
] as const;

export function solanaPubkeyHex(address: string): Hex {
  return bytesToHex(new PublicKey(address).toBytes());
}

export function totalVotes(poll: Poll) {
  return poll.evmVoters + poll.solanaVoters;
}

export function isOpen(poll: Poll, now: number) {
  return now < poll.endsAt;
}

export function optionShare(votes: number, total: number) {
  return total === 0 ? 0 : Math.round((votes / total) * 1000) / 10;
}

export function leadingOption(poll: Poll) {
  let leader = -1;
  let best = 0;
  poll.options.forEach((option, index) => {
    const votes = option.evmVotes + option.solanaVotes;
    if (votes > best) {
      best = votes;
      leader = index;
    } else if (votes === best && votes > 0) {
      leader = -1;
    }
  });
  return leader;
}

export function timeRemaining(endsAt: number, now: number) {
  const seconds = Math.max(0, Math.floor(endsAt - now));
  if (seconds === 0) return "Closed";
  const days = Math.floor(seconds / 86400);
  if (days > 60) return "Open";
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(minutes, 1)}m left`;
}

export function formatUtc(seconds: number) {
  return new Date(seconds * 1000).toUTCString().replace("GMT", "UTC");
}

export function validatePollInput(question: string, description: string, options: string[]) {
  const bytes = (value: string) => new TextEncoder().encode(value).length;
  if (!question.trim()) return "Ask a question.";
  if (bytes(question) > 200) return "The question exceeds the 200-byte on-chain limit.";
  if (bytes(description) > 500) return "The description exceeds the 500-byte on-chain limit.";
  const filled = options.map((option) => option.trim()).filter(Boolean);
  if (filled.length < MIN_OPTIONS) return `Add at least ${MIN_OPTIONS} options.`;
  if (filled.length > MAX_OPTIONS) return `Use at most ${MAX_OPTIONS} options.`;
  if (filled.some((option) => bytes(option) > 64)) return "Each option must fit in 64 bytes.";
  if (new Set(filled.map((option) => option.toLowerCase())).size !== filled.length) {
    return "Options must be different.";
  }
  return null;
}

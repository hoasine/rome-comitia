import type { Poll } from "./types";

const now = Math.floor(Date.UTC(2026, 10, 10) / 1000);

export const demoPolls: Poll[] = [
  {
    id: 3n,
    creator: "0x7f2D39e2a45D7484aA65f6B63F1f94E2a851D5Af",
    question: "Which Rome feature should builders demo first?",
    description: "Pick the capability you would show a new team on day one.",
    options: [
      { label: "Atomic Solana CPI from Solidity", evmVotes: 14, solanaVotes: 19 },
      { label: "Solana wallets on EVM apps", evmVotes: 11, solanaVotes: 22 },
      { label: "Shared liquidity", evmVotes: 9, solanaVotes: 6 },
    ],
    createdAt: now - 86400,
    endsAt: 4102444800,
    evmVoters: 34,
    solanaVoters: 47,
  },
  {
    id: 2n,
    creator: "0x3Fa6E34B41DC1Ce583F64F7B495AD35DdE76E813",
    question: "Should the community treasury fund wallet UX grants?",
    description: "",
    options: [
      { label: "Yes", evmVotes: 21, solanaVotes: 18 },
      { label: "No", evmVotes: 4, solanaVotes: 3 },
    ],
    createdAt: now - 3 * 86400,
    endsAt: 4102444800,
    evmVoters: 25,
    solanaVoters: 21,
  },
  {
    id: 1n,
    creator: "0xA8642Fd55193D34FD987D4DeFA60F3a55f7919b0",
    question: "Best time for the weekly builder call?",
    description: "Times are UTC.",
    options: [
      { label: "08:00", evmVotes: 3, solanaVotes: 7 },
      { label: "14:00", evmVotes: 8, solanaVotes: 5 },
      { label: "20:00", evmVotes: 6, solanaVotes: 6 },
    ],
    createdAt: now - 9 * 86400,
    endsAt: now - 2 * 86400,
    evmVoters: 17,
    solanaVoters: 18,
  },
];

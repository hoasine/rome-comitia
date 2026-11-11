const pollView = {
  name: "",
  type: "tuple",
  components: [
    { name: "id", type: "uint256" },
    { name: "creator", type: "address" },
    { name: "question", type: "string" },
    { name: "description", type: "string" },
    { name: "options", type: "string[]" },
    { name: "evmVotes", type: "uint32[]" },
    { name: "solanaVotes", type: "uint32[]" },
    { name: "createdAt", type: "uint64" },
    { name: "endsAt", type: "uint64" },
    { name: "evmVoters", type: "uint32" },
    { name: "solanaVoters", type: "uint32" },
  ],
} as const;

export const comitiaAbi = [
  {
    type: "function",
    name: "pollCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createPoll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "question", type: "string" },
      { name: "description", type: "string" },
      { name: "options", type: "string[]" },
      { name: "durationSeconds", type: "uint64" },
    ],
    outputs: [{ name: "pollId", type: "uint256" }],
  },
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pollId", type: "uint256" },
      { name: "option", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "voteAsSolana",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pollId", type: "uint256" },
      { name: "option", type: "uint8" },
      { name: "solanaPubkey", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getPoll",
    stateMutability: "view",
    inputs: [{ name: "pollId", type: "uint256" }],
    outputs: [pollView],
  },
  {
    type: "function",
    name: "getPolls",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ ...pollView, type: "tuple[]" }],
  },
  {
    type: "function",
    name: "ballotOf",
    stateMutability: "view",
    inputs: [
      { name: "pollId", type: "uint256" },
      { name: "voter", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "cast", type: "bool" },
          { name: "solana", type: "bool" },
          { name: "option", type: "uint8" },
        ],
      },
    ],
  },
] as const;

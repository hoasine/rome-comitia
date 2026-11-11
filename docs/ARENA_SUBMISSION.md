# Comitia — Arena submission

## One-line description

Comitia runs polls that MetaMask and Solflare users vote in together on Rome, with every Solana vote proven by the contract.

## Problem

Communities that span EVM and Solana run separate polls on each chain, or use off-chain tools that cannot prove who voted. Results are split, and nobody can verify how each ecosystem actually voted.

## Solution

One Solidity contract on Rome Hadrian. Anyone opens a poll with two to six options and a deadline. EVM wallets call `vote`. Solana wallets call `voteAsSolana` through Rome, passing their public key; the contract counts the ballot as Solana only if `msg.sender` is the synthetic address derived from that key. Results show each option's EVM and proven Solana votes side by side.

## Why Rome

Rome is what lets a Solana wallet sign a call to a Solidity contract and share its state with MetaMask users. It is also what makes the Solana proof possible: the synthetic address is a deterministic function of the Solana public key, and only that key can send from it.

## Submission category

EVM and Solana wallets.

## Completed features

- Poll creation from either wallet, two to six options, one hour to 30 days
- One vote per address, enforced on-chain
- Proven Solana ballots via `voteAsSolana` and public `syntheticAddressOf`
- Per-option results split into EVM and Solana
- Open, closed, and all filters; shareable poll pages; Via Explorer links
- Live Hadrian status; labelled preview mode

## Quality

- Contract tests, including a real Solana keypair whose Rome synthetic address is impersonated to vote, and rejected forged public keys
- Unit tests for input limits, results, and the pubkey encoding against the Rome SDK
- Playwright smoke tests on desktop and mobile with a mocked MetaMask session
- GitHub Actions: lint, typecheck, tests, build, browser tests, dependency audit
- Content Security Policy and hardened response headers

## Technical notes

- Network: Rome Hadrian, chain ID `200010`
- Contract: `Comitia.sol`, Solidity `0.8.28`
- EVM writes: Rome SDK `submitRomeTx`
- Solana writes: Rome SDK `submitRomeTxV1`, with a legacy fallback for Solflare

## Submission links

- Live app: `https://rome-comitia.vercel.app`
- Source repository: `https://github.com/hoasine/rome-comitia`
- Contract: `ADD_CONTRACT_ADDRESS`
- Verified source: `ADD_VERIFIED_URL`
- Demo video: `ADD_VIDEO_URL`

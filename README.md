# Comitia

Comitia runs on-chain polls that EVM and Solana wallets vote in together on Rome. One Solidity contract on Hadrian counts every ballot. Solana ballots are proven by the contract: it checks that the caller is the Rome synthetic address derived from the Solana public key, so the EVM / Solana split is verifiable rather than reported by the website.

![CI](https://github.com/hoasine/rome-comitia/actions/workflows/check.yml/badge.svg)

## Why it needs Rome

Rome gives each Solana wallet a synthetic EVM address, `keccak256(pubkey)[12:]`, and lets it call Solidity contracts by signing with Solflare. Comitia uses that in two ways:

- MetaMask and Solflare users vote in the same poll, against the same state, with no bridge or second deployment.
- `voteAsSolana(pollId, option, pubkey)` only succeeds when `msg.sender` equals the address derived from `pubkey`. Only the holder of that Solana key can send from that address, so every Solana vote is tied to a real Solana signer.

## Features

- Create a poll with two to six options and a deadline from one hour to 30 days
- Vote once per address from MetaMask or Solflare
- Results per option, split into EVM votes and proven Solana votes
- Open, closed, and all filters; shareable `/poll/[id]` pages; Via Explorer links
- Live Hadrian block height and a labelled read-only preview when no contract is configured

## Contract

`contracts/Comitia.sol`, Solidity 0.8.28:

- `createPoll(question, description, options, durationSeconds)`
- `vote(pollId, option)` and `voteAsSolana(pollId, option, solanaPubkey)`
- `getPoll(pollId)`, `getPolls(offset, limit)` newest first, `ballotOf(pollId, voter)`
- `syntheticAddressOf(solanaPubkey)` exposes the derivation for anyone to check

No owner, no upgrades, no funds. Strings are bounded in UTF-8 bytes.

A Solana user could still call `vote` instead of `voteAsSolana`; that ballot is then counted in the EVM column. The Solana column therefore never overstates Solana participation.

## Local development

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

With no contract configured, Comitia shows a labelled preview with sample polls.

```bash
npm run check          # lint, typecheck, contract + unit tests, production build
npx playwright install chromium
npm run test:e2e       # desktop + mobile smoke tests against the preview build
```

## Deploy to Hadrian

Fund a test wallet with Hadrian USDC gas through the Rome Bridge, then run:

```bash
npm run deploy:secure
```

The command asks for the key with hidden input, deploys, writes `deployments/hadrian.json`, and verifies the source on Rome's Sourcify. Configure the frontend:

```bash
NEXT_PUBLIC_COMITIA_ADDRESS=0x...
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

## Wallets

- MetaMask is switched to Rome Hadrian (chain ID `200010`) automatically.
- Solflare must be on Devnet. Comitia uses Rome's v1 transaction route when Solflare advertises it, and the legacy route otherwise. A new synthetic address is activated with one extra signature on first use.

See [`docs/ARENA_SUBMISSION.md`](docs/ARENA_SUBMISSION.md) and [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

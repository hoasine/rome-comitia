# Comitia demo script

Target length: about 2 minutes.

## Preparation

1. Open the deployed Comitia app.
2. Have MetaMask on Rome Hadrian and Solflare on Devnet, each with a little test gas.
3. Open the contract in Via Explorer in a second tab.

## Recording

### 1. The idea (15 s)

"Comitia is one poll for both wallet worlds. MetaMask and Solflare vote into the same contract on Rome, and the contract proves which votes came from Solana."

### 2. Create a poll from MetaMask (30 s)

Connect MetaMask, choose "Create a poll", add a question and three options, pick one day, and sign. The app opens the new poll page.

### 3. Vote from MetaMask (20 s)

Pick an option and sign. Point at the orange EVM segment and the "You voted" note.

### 4. Vote from Solflare (35 s)

Switch to Solflare, pick a different option, and approve the Rome authorization and transaction. Point at the purple Solana segment: "This vote is counted as Solana only because the contract checked that the sender is the address derived from this Solana public key."

### 5. Proof (20 s)

Show the `voteAsSolana` transaction in Via Explorer and the `syntheticAddressOf` read on the verified contract.

"No bridge, no second deployment, no trust in the website. One vote, both wallet worlds, on Rome."

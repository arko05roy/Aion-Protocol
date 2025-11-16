# Proof-of-Intelligence Protocol

A decentralized consensus mechanism where intelligent agents coordinate to produce, evaluate, and exchange digital commodities derived from artificial intelligence workloads.

## Overview

The Proof-of-Intelligence Protocol (PoI) establishes a decentralized consensus mechanism where:

- **Miners** produce AI-related digital commodities (inference, embeddings, training, etc.)
- **Validators** evaluate the quality and integrity of miners' outputs
- **Consensus** is achieved through evaluative proof (not recomputation)
- **Rewards** are distributed based on consensus-aligned performance

## Architecture

### EVM Smart Contracts

The protocol will be implemented as a set of modular smart contracts on EVM-compatible chains:

1. **Registry Contract**
   - Subnet creation and configuration
   - Neuron registration and UID assignment
   - Subnet metadata management

2. **Staking Contract**
   - Validator staking
   - Delegation mechanics
   - Stake weight calculation: `W = α + 0.18 × τ`

3. **Consensus Contract**
   - Weight submission from validators
   - Weighted Median Consensus Algorithm
   - Trust score calculation

4. **Emissions Contract**
   - Reward distribution based on consensus
   - α token (TAO-equivalent) accounting
   - Cross-subnet allocation

5. **Hive Contract**
   - Global metagraph registry
   - Inter-subnet coordination
   - Global governance

### Protocol

- **Synapse Protocol**: HTTP-based communication between validators (Dendrite) and miners (Axon)
- **Proof-of-Intelligence**: Evaluative consensus mechanism (not recomputational)
- **Epoch-Based**: Time-based epochs for predictable consensus cycles

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Documentation

- [Protocol Specification](./docs/PROTOCOL.md) - Complete Synapse protocol specification
- [Architecture Plan](./plan.md) - Detailed technical architecture

## Project Structure

```
poi/
├── contracts/          # EVM smart contracts (Solidity)
├── app/                # Next.js frontend
├── docs/               # Documentation
└── package.json        # Project configuration
```

## Key Features

- **Modular Contracts**: Separate contracts for maintainability
- **On-Chain Consensus**: Transparent, verifiable consensus computation
- **Weighted Median**: Robust consensus algorithm resistant to outliers
- **Subnet Autonomy**: Each subnet manages its own economy
- **EVM Compatible**: Works on Ethereum and EVM-compatible chains

## License

[To be determined]

## Contributing

[To be determined]

# AIon Protocol - EVM Implementation

A decentralized Proof-of-Intelligence consensus mechanism where intelligent agents coordinate to produce, evaluate, and exchange digital commodities derived from artificial intelligence workloads.

## Overview

The AIon Protocol establishes a decentralized consensus mechanism where:

- **Miners** produce AI-related digital commodities (inference, embeddings, training, etc.)
- **Validators** evaluate the quality and integrity of miners' outputs
- **Consensus** is achieved through evaluative proof (not recomputation)
- **Rewards** are distributed based on consensus-aligned performance

## Architecture

### Smart Contracts (EVM)

Deployed on Avalanche C-Chain (testnet support):

1. **Registry Contract** - Subnet creation, neuron registration, UID assignment
2. **Staking Contract** - Validator staking with formula: `W = α + 0.18τ`
3. **Consensus Contract** - Weight submission, weighted median consensus, trust calculation
4. **Emissions Contract** - Reward distribution (41% miners, 18% validators, 41% delegators)
5. **Hive Contract** - Global metagraph registry and inter-subnet coordination
6. **AionToken (ERC-20)** - TAO-equivalent emissions token with USDC swap

### TypeScript SDK

Located in `sdk/`:
- Contract wrappers for all core contracts
- Type definitions for Synapse messages
- Signature utilities for authentication
- Easy integration with ethers.js

### CLI Tools

**Axon (Miner Server)** - `cli/axon/`
```bash
cd cli/axon
npm start start --subnet 1 --port 8080 --hotkey <private_key>
```

**Dendrite (Validator Client)** - `cli/dendrite/`
```bash
cd cli/dendrite
npm start start --subnet 1 --hotkey <private_key> --miners http://localhost:8080
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install contract dependencies
cd contracts && npm install

# Install SDK dependencies
cd ../sdk && npm install

# Install CLI dependencies
cd ../cli/axon && npm install
cd ../cli/dendrite && npm install
```

### Compile Contracts

```bash
cd contracts
npm run compile
```

### Run Tests

```bash
cd contracts
npm test
```

### Deploy to Avalanche Fuji Testnet

1. Set up environment variables:
```bash
cd contracts
cp .env.example .env
# Edit .env with your PRIVATE_KEY and SNOWTRACE_API_KEY
```

2. Get testnet AVAX from faucet: https://faucet.avax.network

3. Deploy contracts:
```bash
npm run deploy:fuji
```

4. Verify contracts on Snowtrace (copy commands from deployment output)

## Project Structure

```
poi/
├── contracts/              # Solidity smart contracts
│   ├── contracts/
│   │   ├── core/          # Registry, Staking, Consensus, Emissions, Hive
│   │   ├── tokens/        # AionToken ERC-20
│   │   └── libraries/     # WeightedMedian, StakeCalculation, SubnetMath
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
├── sdk/                   # TypeScript SDK
│   └── src/
│       ├── contracts/     # Contract wrappers
│       ├── types/         # Type definitions
│       └── utils/         # Utilities
├── cli/
│   ├── axon/             # Miner server
│   └── dendrite/         # Validator client
├── docs/                 # Documentation
└── plan.md              # Implementation plan

```

## Key Features

- **Modular Contracts**: Separate contracts for maintainability and gas optimization
- **On-Chain Consensus**: Transparent, verifiable weighted median consensus
- **Weighted Median Algorithm**: Robust consensus resistant to outliers
- **Subnet Autonomy**: Each subnet manages its own economy and incentives
- **EVM Compatible**: Works on Avalanche, Ethereum, and any EVM chain
- **Native Token + USDC**: Hybrid token model for emissions and payments

## Protocol Flow

1. **Subnet Creation**: Governor creates subnet with parameters
2. **Neuron Registration**: Miners register with PoW
3. **Validator Staking**: Validators stake AVAX/ETH for permits
4. **Task Execution**: Validators query miners via Synapse protocol
5. **Weight Submission**: Validators score miners and submit weights
6. **Consensus Calculation**: Weighted median determines performance
7. **Emissions Distribution**: Rewards distributed based on consensus

## Documentation

- [Protocol Specification](./docs/PROTOCOL.md) - Complete Synapse protocol specification
- [Implementation Plan](./plan.md) - Detailed technical implementation
- [Smart Contract ABIs](./contracts/artifacts/) - Generated after compilation

## Testing

Run all tests:
```bash
cd contracts
npm test
```

Run specific test suites:
```bash
npm run test:registry
npm run test:integration
```

## License

[To be determined]

## Contributing

[To be determined]

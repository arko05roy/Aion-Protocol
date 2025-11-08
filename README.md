# Proof-of-Intelligence Protocol

A decentralized consensus mechanism where intelligent agents coordinate to produce, evaluate, and exchange digital commodities derived from artificial intelligence workloads.

## Overview

The Proof-of-Intelligence Protocol (PoI) establishes a decentralized consensus mechanism where:

- **Miners** produce AI-related digital commodities (inference, embeddings, training, etc.)
- **Validators** evaluate the quality and integrity of miners' outputs
- **Consensus** is achieved through evaluative proof (not recomputation)
- **Rewards** are distributed based on consensus-aligned performance

## Architecture

### Solana Programs

1. **Registry Program** (`programs/registry/`)
   - Subnet creation and configuration
   - Neuron registration and UID assignment
   - Subnet metadata management

2. **Staking Program** (`programs/staking/`)
   - Validator SOL staking
   - Delegation mechanics
   - Stake weight calculation: `W = α + 0.18 × τ`

3. **Consensus Program** (`programs/consensus/`)
   - Weight submission from validators
   - Weighted Median Consensus Algorithm
   - Trust score calculation

4. **Emissions Program** (`programs/emissions/`)
   - Reward distribution based on consensus
   - α token (TAO-equivalent) accounting
   - Cross-subnet allocation

5. **Hive Program** (`programs/hive/`)
   - Global metagraph registry
   - Inter-subnet coordination
   - Global governance

### Protocol

- **Synapse Protocol**: HTTP-based communication between validators (Dendrite) and miners (Axon)
- **Proof-of-Intelligence**: Evaluative consensus mechanism (not recomputational)
- **Epoch-Based**: Time-based epochs for predictable consensus cycles

## Getting Started

### Prerequisites

- Rust 1.90.0+
- Solana CLI (for deployment)
- Anchor Framework 0.30.0+

### Building

```bash
# Build all programs
anchor build

# Build specific program
cd programs/registry && cargo build-sbf
```

### Testing

```bash
# Run tests
anchor test
```

## Documentation

- [Protocol Specification](./docs/PROTOCOL.md) - Complete Synapse protocol specification
- [Architecture Plan](./plan.md) - Detailed technical architecture

## Project Structure

```
poi/
├── programs/
│   ├── registry/      # Subnet and neuron registry
│   ├── staking/       # Staking and delegation
│   ├── consensus/     # Weighted median consensus
│   ├── emissions/     # Reward distribution
│   └── hive/          # Global metagraph
├── shared/            # Shared types and utilities
├── docs/              # Documentation
└── Anchor.toml        # Anchor configuration
```

## Key Features

- **Modular Programs**: Separate programs for maintainability
- **On-Chain Consensus**: Transparent, verifiable consensus computation
- **Weighted Median**: Robust consensus algorithm resistant to outliers
- **Subnet Autonomy**: Each subnet manages its own economy
- **Solana Native**: Leverages Solana's speed and low fees

## License

[To be determined]

## Contributing

[To be determined]


/**
 * Deployed contract addresses for AIon Protocol
 * Auto-generated from deployment files
 */

export const AVALANCHE_FUJI_ADDRESSES = {
    AionToken: "0x9A9E78F0F72B5A2125DB1f299dD200ceA153ef49",
    Registry: "0x768AE3e1638F444dBd0FBeeD8AE3756BD468F82C",
    Staking: "0x643C5d6Cf423207f5e18ef562F399029b16d432B",
    Consensus: "0xaD7881EE33Db6f0d91d75a433fe62eb13f40029C",
    Emissions: "0x8D513D0dc289185f7Dc24bd3Dcf3ce95D3c7dC70",
    Hive: "0x2c80b35439429e9beCe9Bb945489f2BCBA80bA1f",
} as const;

export const NETWORKS = {
    avalancheFuji: {
        chainId: 43113,
        rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
        explorer: "https://testnet.snowtrace.io",
        addresses: AVALANCHE_FUJI_ADDRESSES,
    },
} as const;

export type NetworkName = keyof typeof NETWORKS;


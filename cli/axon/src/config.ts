/**
 * Configuration for Axon miner server
 */

export interface AxonConfig {
    subnetId: number;
    port: number;
    hotkey: string;
    coldkey?: string;
    uid?: number;
    rpcUrl?: string;
    registryAddress?: string;
}

export const DEFAULT_CONFIG: Partial<AxonConfig> = {
    port: 8080,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    registryAddress: "0x768AE3e1638F444dBd0FBeeD8AE3756BD468F82C", // Avalanche Fuji Registry
};


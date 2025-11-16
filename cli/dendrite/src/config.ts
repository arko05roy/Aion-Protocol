/**
 * Configuration for Dendrite validator client
 */

export interface DendriteConfig {
    subnetId: number;
    hotkey: string;
    rpcUrl: string;
    registryAddress?: string;
    consensusAddress?: string;
    stakingAddress?: string;
    miners?: string[];
}

export const DEFAULT_CONFIG: Partial<DendriteConfig> = {
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    registryAddress: "0x768AE3e1638F444dBd0FBeeD8AE3756BD468F82C", // Avalanche Fuji Registry
    consensusAddress: "0xaD7881EE33Db6f0d91d75a433fe62eb13f40029C", // Avalanche Fuji Consensus
    stakingAddress: "0x643C5d6Cf423207f5e18ef562F399029b16d432B", // Avalanche Fuji Staking
};


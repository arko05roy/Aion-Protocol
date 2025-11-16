/**
 * Neuron and subnet types
 */

export interface Neuron {
    hotkey: string;
    coldkey: string;
    uid: number;
    subnetId: number;
    registeredAt: bigint;
    immunityUntil: bigint;
    active: boolean;
}

export interface Subnet {
    governor: string;
    maxNeurons: number;
    validatorLimit: number;
    emissionRate: bigint;
    incentiveFunctionHash: string;
    neuronCount: number;
    createdAt: bigint;
    active: boolean;
}

export interface ValidatorStake {
    directStake: bigint;
    totalDelegated: bigint;
    lastUpdateBlock: bigint;
    active: boolean;
}

export interface TrustScore {
    minerTrust: bigint;
    validatorTrust: bigint;
    alignmentScore: bigint;
    totalSubmissions: bigint;
    lastUpdated: bigint;
}

export interface Weight {
    uid: number;
    weight: bigint;
}


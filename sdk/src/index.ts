/**
 * AIon Protocol SDK
 * TypeScript SDK for interacting with AIon Protocol smart contracts
 */

import { Provider, Signer, Contract } from 'ethers';
import { RegistryContract } from './contracts/Registry';
import { NETWORKS, NetworkName } from './config/addresses';

export * from './types/synapse';
export * from './types/neuron';
export * from './utils/signature';
export * from './config/addresses';

/**
 * Main AIon Protocol client
 */
export class AionClient {
    private provider: Provider;
    private signer: Signer | null;

    public registry: RegistryContract | null = null;
    
    constructor(provider: Provider, signer?: Signer) {
        this.provider = provider;
        this.signer = signer || null;
    }

    /**
     * Initialize contract instances from network
     * @param network Network name (e.g., 'avalancheFuji')
     * @param abis Contract ABIs
     */
    initializeFromNetwork(
        network: NetworkName,
        abis: {
            registry: any[];
            staking?: any[];
            consensus?: any[];
            emissions?: any[];
            hive?: any[];
            aionToken?: any[];
        }
    ) {
        const networkConfig = NETWORKS[network];
        const signerOrProvider = this.signer || this.provider;
        
        this.registry = new RegistryContract(
            networkConfig.addresses.Registry,
            abis.registry,
            signerOrProvider
        );

        // Additional contracts can be initialized here
    }

    /**
     * Initialize contract instances with custom addresses
     * @param addresses Contract addresses
     * @param abis Contract ABIs
     */
    initializeContracts(
        addresses: {
            registry: string;
            staking?: string;
            consensus?: string;
            emissions?: string;
            hive?: string;
            aionToken?: string;
        },
        abis: {
            registry: any[];
            staking?: any[];
            consensus?: any[];
            emissions?: any[];
            hive?: any[];
            aionToken?: any[];
        }
    ) {
        const signerOrProvider = this.signer || this.provider;
        
        this.registry = new RegistryContract(
            addresses.registry,
            abis.registry,
            signerOrProvider
        );

        // Additional contracts can be initialized here
    }

    /**
     * Get connected address
     */
    async getAddress(): Promise<string> {
        if (!this.signer) throw new Error('No signer connected');
        return this.signer.getAddress();
    }

    /**
     * Get provider
     */
    getProvider(): Provider {
        return this.provider;
    }

    /**
     * Get signer
     */
    getSigner(): Signer {
        if (!this.signer) throw new Error('No signer connected');
        return this.signer;
    }
}


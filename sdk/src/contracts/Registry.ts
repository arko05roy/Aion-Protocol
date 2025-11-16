import { Contract, Provider, Signer } from 'ethers';
import { Neuron, Subnet } from '../types/neuron';

/**
 * Registry contract wrapper
 */
export class RegistryContract {
    private contract: Contract;

    constructor(address: string, abi: any[], signerOrProvider: Signer | Provider) {
        this.contract = new Contract(address, abi, signerOrProvider);
    }

    async createSubnet(
        maxNeurons: number,
        validatorLimit: number,
        emissionRate: bigint,
        incentiveFunctionHash: string
    ): Promise<{ subnetId: number; tx: any }> {
        const tx = await this.contract.createSubnet(
            maxNeurons,
            validatorLimit,
            emissionRate,
            incentiveFunctionHash
        );
        const receipt = await tx.wait();
        
        // Parse SubnetCreated event
        const event = receipt.logs.find((log: any) => 
            log.topics[0] === this.contract.interface.getEvent('SubnetCreated').topicHash
        );
        
        const subnetId = Number(event?.topics[1] || 0);
        return { subnetId, tx };
    }

    async registerNeuron(
        subnetId: number,
        hotkey: string,
        coldkey: string,
        proofOfWork: Uint8Array
    ): Promise<{ uid: number; tx: any }> {
        const tx = await this.contract.registerNeuron(
            subnetId,
            hotkey,
            coldkey,
            proofOfWork
        );
        const receipt = await tx.wait();
        
        // Parse NeuronRegistered event
        const event = receipt.logs.find((log: any) => 
            log.topics[0] === this.contract.interface.getEvent('NeuronRegistered').topicHash
        );
        
        const uid = Number(event?.topics[2] || 0);
        return { uid, tx };
    }

    async getSubnet(subnetId: number): Promise<Subnet> {
        const subnet = await this.contract.getSubnet(subnetId);
        return {
            governor: subnet.governor,
            maxNeurons: Number(subnet.maxNeurons),
            validatorLimit: Number(subnet.validatorLimit),
            emissionRate: BigInt(subnet.emissionRate),
            incentiveFunctionHash: subnet.incentiveFunctionHash,
            neuronCount: Number(subnet.neuronCount),
            createdAt: BigInt(subnet.createdAt),
            active: subnet.active,
        };
    }

    async getNeuron(subnetId: number, uid: number): Promise<Neuron> {
        const neuron = await this.contract.getNeuron(subnetId, uid);
        return {
            hotkey: neuron.hotkey,
            coldkey: neuron.coldkey,
            uid: Number(neuron.uid),
            subnetId: Number(neuron.subnetId),
            registeredAt: BigInt(neuron.registeredAt),
            immunityUntil: BigInt(neuron.immunityUntil),
            active: neuron.active,
        };
    }

    async getUidByHotkey(subnetId: number, hotkey: string): Promise<number> {
        return Number(await this.contract.getUidByHotkey(subnetId, hotkey));
    }

    getAddress(): string {
        return this.contract.target as string;
    }
}


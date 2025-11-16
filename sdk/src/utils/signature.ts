import { Wallet, hashMessage, SigningKey } from 'ethers';

/**
 * Signature utilities for Synapse messages
 */

export function signMessage(message: string, privateKey: string): string {
    const wallet = new Wallet(privateKey);
    return wallet.signMessageSync(message);
}

export function verifySignature(message: string, signature: string, address: string): boolean {
    try {
        const messageHash = hashMessage(message);
        const recoveredAddress = SigningKey.recoverPublicKey(messageHash, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
        return false;
    }
}

export function createSynapseSignature(synapse: any, privateKey: string): string {
    const message = JSON.stringify({
        version: synapse.version,
        subnet_id: synapse.subnet_id,
        task_id: synapse.task_id,
        task_type: synapse.task_type,
        payload: synapse.payload,
        metadata: synapse.metadata,
    });
    return signMessage(message, privateKey);
}


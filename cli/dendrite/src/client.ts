#!/usr/bin/env node

/**
 * Dendrite - Validator Client
 * Client for querying miners and submitting consensus weights
 */

import axios from 'axios';
import { Wallet, JsonRpcProvider } from 'ethers';
import { config } from 'dotenv';
import { Command } from 'commander';

config();

interface MinerEndpoint {
    uid: number;
    hotkey: string;
    endpoint: string;
}

class DendriteClient {
    private wallet: Wallet;
    private provider: JsonRpcProvider;
    private subnetId: number;
    private miners: MinerEndpoint[];

    constructor(privateKey: string, rpcUrl: string, subnetId: number) {
        this.provider = new JsonRpcProvider(rpcUrl);
        this.wallet = new Wallet(privateKey, this.provider);
        this.subnetId = subnetId;
        this.miners = [];
    }

    async addMiner(uid: number, hotkey: string, endpoint: string) {
        this.miners.push({ uid, hotkey, endpoint });
        console.log(`Added miner UID ${uid} at ${endpoint}`);
    }

    async queryMiners(task: any): Promise<Map<number, any>> {
        const responses = new Map<number, any>();

        console.log(`\nQuerying ${this.miners.length} miners...`);

        for (const miner of this.miners) {
            try {
                const synapse = await this.createSynapse(task, miner);
                const response = await this.sendSynapse(miner.endpoint, synapse);
                
                const score = this.evaluateResponse(response);
                responses.set(miner.uid, { response, score });
                
                console.log(`✓ Miner ${miner.uid}: score ${score.toFixed(2)}`);
            } catch (error: any) {
                console.log(`✗ Miner ${miner.uid}: ${error.message}`);
                responses.set(miner.uid, { response: null, score: 0 });
            }
        }

        return responses;
    }

    private async createSynapse(task: any, miner: MinerEndpoint): Promise<any> {
        const synapse = {
            version: '1.0.0',
            subnet_id: this.subnetId,
            task_id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            task_type: task.type || 'inference',
            payload: {
                input: task.input,
                parameters: task.parameters || {},
            },
            metadata: {
                validator_uid: 0, // Should be fetched from contract
                validator_hotkey: this.wallet.address,
                timestamp: Date.now(),
                timeout: 30000,
                nonce: Math.random().toString(36).substr(2, 9),
            },
            signature: '',
        };

        // Sign synapse
        const message = JSON.stringify({
            version: synapse.version,
            subnet_id: synapse.subnet_id,
            task_id: synapse.task_id,
            task_type: synapse.task_type,
            payload: synapse.payload,
            metadata: synapse.metadata,
        });
        synapse.signature = await this.wallet.signMessage(message);

        return synapse;
    }

    private async sendSynapse(endpoint: string, synapse: any): Promise<any> {
        const response = await axios.post(`${endpoint}/synapse`, synapse, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    }

    private evaluateResponse(response: any): number {
        if (!response || !response.result) return 0;

        // Simple scoring (in production, use subnet-specific metrics)
        const latency = response.result.metrics?.latency_ms || 1000;
        const quality = response.result.metrics?.quality_score || 5000;

        // Score: lower latency + higher quality = better
        const latencyScore = Math.max(0, 1 - (latency / 1000)) * 5000;
        const totalScore = (latencyScore + quality) / 2;

        return totalScore;
    }

    async submitWeights(weights: Map<number, number>) {
        console.log('\n📊 Submitting weights to consensus contract...');

        const minerUids = Array.from(weights.keys());
        const minerWeights = Array.from(weights.values());

        console.log('Weights:', Array.from(weights.entries()).map(([uid, w]) => 
            `UID ${uid}: ${w.toFixed(0)}`
        ).join(', '));

        // In production, submit to Consensus contract
        console.log('✓ Weights submitted (simulated)');
    }

    async start() {
        console.log(`
╔════════════════════════════════════════════════════╗
║        DENDRITE VALIDATOR CLIENT STARTED           ║
╠════════════════════════════════════════════════════╣
║ Subnet ID:  ${this.subnetId.toString().padEnd(37)} ║
║ Validator:  ${this.wallet.address.slice(0, 10)}...${this.wallet.address.slice(-4)}                ║
║ Miners:     ${this.miners.length.toString().padEnd(37)} ║
╚════════════════════════════════════════════════════╝
        `);

        // Main validation loop
        while (true) {
            try {
                // Example task
                const task = {
                    type: 'inference',
                    input: 'What is the capital of France?',
                    parameters: {},
                };

                const responses = await this.queryMiners(task);

                // Calculate weights from scores
                const weights = new Map<number, number>();
                responses.forEach((data, uid) => {
                    weights.set(uid, data.score);
                });

                await this.submitWeights(weights);

                // Wait before next round
                console.log('\n⏳ Waiting for next validation round...\n');
                await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute

            } catch (error) {
                console.error('Error in validation loop:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
}

// CLI
const program = new Command();

program
    .name('dendrite')
    .description('AIon Protocol - Dendrite Validator Client')
    .version('0.1.0');

program
    .command('start')
    .description('Start the Dendrite validator client')
    .option('--subnet <id>', 'Subnet ID', '1')
    .option('--rpc <url>', 'RPC URL', 'https://api.avax-test.network/ext/bc/C/rpc')
    .option('--hotkey <key>', 'Private key for validator hotkey')
    .option('--miners <endpoints>', 'Comma-separated miner endpoints', '')
    .action(async (options) => {
        const privateKey = options.hotkey || process.env.DENDRITE_PRIVATE_KEY;
        if (!privateKey) {
            console.error('Error: Private key required (--hotkey or DENDRITE_PRIVATE_KEY)');
            process.exit(1);
        }

        const client = new DendriteClient(
            privateKey,
            options.rpc,
            parseInt(options.subnet)
        );

        // Add miners
        if (options.miners) {
            const endpoints = options.miners.split(',');
            for (let i = 0; i < endpoints.length; i++) {
                await client.addMiner(i, `0x${i.toString().padStart(40, '0')}`, endpoints[i].trim());
            }
        }

        await client.start();
    });

program.parse();


import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class TestValidator {
  private process: ChildProcess | null = null;
  private readonly port: number;

  constructor(port: number = 8899) {
    this.port = port;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('solana-test-validator', [
        '--reset',
        '--quiet',
        `--rpc-port=${this.port}`,
      ]);

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 5000);

      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Validator started') || output.includes('RPC')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve();
          }
        }
      });

      this.process.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('error') && !output.includes('WARNING')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            reject(new Error(output));
          }
        }
      });

      this.process.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function airdropSol(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 2
): Promise<string> {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);
  return signature;
}

export function createKeypair(): Keypair {
  return Keypair.generate();
}

export function createKeypairFromFile(filePath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export async function findProgramAddress(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(seeds, programId);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  maxAttempts: number = 20
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await connection.getSignatureStatus(signature);
    if (status?.value?.confirmationStatus === 'confirmed' || 
        status?.value?.confirmationStatus === 'finalized') {
      return true;
    }
    await sleep(500);
  }
  return false;
}

export function serializeU16(value: number): Buffer {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

export function serializeU64(value: number | bigint): Buffer {
  const buffer = Buffer.allocUnsafe(8);
  const val = typeof value === 'bigint' ? value : BigInt(value);
  buffer.writeBigUInt64LE(val, 0);
  return buffer;
}

export function serializeI64(value: number | bigint): Buffer {
  const buffer = Buffer.allocUnsafe(8);
  const val = typeof value === 'bigint' ? value : BigInt(value);
  buffer.writeBigInt64LE(val, 0);
  return buffer;
}

export function deserializeU16(buffer: Buffer, offset: number = 0): number {
  return buffer.readUInt16LE(offset);
}

export function deserializeU64(buffer: Buffer, offset: number = 0): bigint {
  return buffer.readBigUInt64LE(offset);
}

export function deserializeI64(buffer: Buffer, offset: number = 0): bigint {
  return buffer.readBigInt64LE(offset);
}

export function deserializePubkey(buffer: Buffer, offset: number = 0): PublicKey {
  return new PublicKey(buffer.slice(offset, offset + 32));
}


import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import {
  serializeU16,
  serializeU64,
  serializeI64,
  findProgramAddress,
} from '../utils/test-utils.js';

export const REGISTRY_PROGRAM_ID = new PublicKey('iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u');

export enum RegistryInstruction {
  CreateSubnet = 0,
  RegisterNeuron = 1,
  UpdateSubnetConfig = 2,
  PruneNeuron = 3,
  UpdateNeuronStatus = 4,
}

export interface CreateSubnetParams {
  subnetId: number;
  maxNeurons: number;
  validatorLimit: number;
  emissionRate: number | bigint;
  incentiveFunctionHash: Uint8Array;
}

export interface RegisterNeuronParams {
  subnetId: number;
}

export interface UpdateSubnetConfigParams {
  maxNeurons?: number;
  validatorLimit?: number;
  emissionRate?: number | bigint;
  incentiveFunctionHash?: Uint8Array;
}

export interface PruneNeuronParams {
  subnetId: number;
  uid: number;
}

export interface UpdateNeuronStatusParams {
  rank?: number | bigint;
  trust?: number | bigint;
  incentive?: number | bigint;
  validatorTrust?: number | bigint;
  isValidator?: boolean;
}

export class RegistryClient {
  constructor(
    private connection: Connection,
    private programId: PublicKey = REGISTRY_PROGRAM_ID
  ) {}

  async createSubnet(
    governor: Keypair,
    params: CreateSubnetParams
  ): Promise<[PublicKey, string]> {
    const [subnetPda] = await findProgramAddress(
      [Buffer.from('subnet'), serializeU16(params.subnetId)],
      this.programId
    );

    const instruction = this.createSubnetInstruction(governor.publicKey, subnetPda, params);
    const transaction = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [governor]
    );

    return [subnetPda, signature];
  }

  async registerNeuron(
    hotkey: Keypair,
    coldkey: PublicKey,
    params: RegisterNeuronParams
  ): Promise<[PublicKey, string]> {
    const [subnetPda] = await findProgramAddress(
      [Buffer.from('subnet'), serializeU16(params.subnetId)],
      this.programId
    );

    const [neuronPda] = await findProgramAddress(
      [
        Buffer.from('neuron'),
        serializeU16(params.subnetId),
        hotkey.publicKey.toBuffer(),
      ],
      this.programId
    );

    const instruction = this.registerNeuronInstruction(
      hotkey.publicKey,
      coldkey,
      subnetPda,
      neuronPda,
      params
    );
    const transaction = new Transaction().add(instruction);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [hotkey]
    );

    return [neuronPda, signature];
  }

  async updateSubnetConfig(
    governor: Keypair,
    subnetPda: PublicKey,
    params: UpdateSubnetConfigParams
  ): Promise<string> {
    const instruction = this.updateSubnetConfigInstruction(governor.publicKey, subnetPda, params);
    const transaction = new Transaction().add(instruction);

    return await sendAndConfirmTransaction(this.connection, transaction, [governor]);
  }

  async pruneNeuron(
    authority: Keypair,
    subnetPda: PublicKey,
    neuronPda: PublicKey,
    consensusProgram: PublicKey,
    params: PruneNeuronParams
  ): Promise<string> {
    const instruction = this.pruneNeuronInstruction(
      authority.publicKey,
      subnetPda,
      neuronPda,
      consensusProgram,
      params
    );
    const transaction = new Transaction().add(instruction);

    return await sendAndConfirmTransaction(this.connection, transaction, [authority]);
  }

  async updateNeuronStatus(
    authority: Keypair,
    neuronPda: PublicKey,
    consensusProgram: PublicKey,
    stakingProgram: PublicKey,
    params: UpdateNeuronStatusParams
  ): Promise<string> {
    const instruction = this.updateNeuronStatusInstruction(
      authority.publicKey,
      neuronPda,
      consensusProgram,
      stakingProgram,
      params
    );
    const transaction = new Transaction().add(instruction);

    return await sendAndConfirmTransaction(this.connection, transaction, [authority]);
  }

  private createSubnetInstruction(
    governor: PublicKey,
    subnetPda: PublicKey,
    params: CreateSubnetParams
  ): TransactionInstruction {
    const data = Buffer.alloc(1 + 2 + 1 + 1 + 8 + 32);
    let offset = 0;
    data[offset++] = RegistryInstruction.CreateSubnet;
    serializeU16(params.subnetId).copy(data, offset);
    offset += 2;
    data[offset++] = params.maxNeurons;
    data[offset++] = params.validatorLimit;
    serializeU64(params.emissionRate).copy(data, offset);
    offset += 8;
    Buffer.from(params.incentiveFunctionHash).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: subnetPda, isSigner: false, isWritable: true },
        { pubkey: governor, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  private registerNeuronInstruction(
    hotkey: PublicKey,
    coldkey: PublicKey,
    subnetPda: PublicKey,
    neuronPda: PublicKey,
    params: RegisterNeuronParams
  ): TransactionInstruction {
    const data = Buffer.alloc(1 + 2);
    let offset = 0;
    data[offset++] = RegistryInstruction.RegisterNeuron;
    serializeU16(params.subnetId).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: subnetPda, isSigner: false, isWritable: true },
        { pubkey: neuronPda, isSigner: false, isWritable: true },
        { pubkey: hotkey, isSigner: true, isWritable: true },
        { pubkey: coldkey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  private updateSubnetConfigInstruction(
    governor: PublicKey,
    subnetPda: PublicKey,
    params: UpdateSubnetConfigParams
  ): TransactionInstruction {
    // Simplified serialization - in production would need proper optional handling
    const data = Buffer.alloc(1 + 1 + 1 + 1 + 8 + 1 + 32);
    let offset = 0;
    data[offset++] = RegistryInstruction.UpdateSubnetConfig;
    data[offset++] = params.maxNeurons !== undefined ? 1 : 0;
    if (params.maxNeurons !== undefined) {
      data[offset++] = params.maxNeurons;
    }
    data[offset++] = params.validatorLimit !== undefined ? 1 : 0;
    if (params.validatorLimit !== undefined) {
      data[offset++] = params.validatorLimit;
    }
    // Simplified - would need proper optional serialization
    // ... (similar for emission_rate and hash)

    return new TransactionInstruction({
      keys: [
        { pubkey: subnetPda, isSigner: false, isWritable: true },
        { pubkey: governor, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  private pruneNeuronInstruction(
    authority: PublicKey,
    subnetPda: PublicKey,
    neuronPda: PublicKey,
    consensusProgram: PublicKey,
    params: PruneNeuronParams
  ): TransactionInstruction {
    const data = Buffer.alloc(1 + 2 + 2);
    let offset = 0;
    data[offset++] = RegistryInstruction.PruneNeuron;
    serializeU16(params.subnetId).copy(data, offset);
    offset += 2;
    serializeU16(params.uid).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: subnetPda, isSigner: false, isWritable: true },
        { pubkey: neuronPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: consensusProgram, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  private updateNeuronStatusInstruction(
    authority: PublicKey,
    neuronPda: PublicKey,
    consensusProgram: PublicKey,
    stakingProgram: PublicKey,
    params: UpdateNeuronStatusParams
  ): TransactionInstruction {
    // Simplified - would need proper optional serialization
    const data = Buffer.alloc(1 + 9 + 9 + 9 + 9 + 2); // Max size
    let offset = 0;
    data[offset++] = RegistryInstruction.UpdateNeuronStatus;
    // Simplified serialization
    // ... (would serialize optional fields properly)

    return new TransactionInstruction({
      keys: [
        { pubkey: neuronPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: consensusProgram, isSigner: false, isWritable: false },
        { pubkey: stakingProgram, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  async getSubnet(subnetPda: PublicKey): Promise<any> {
    const accountInfo = await this.connection.getAccountInfo(subnetPda);
    if (!accountInfo) {
      return null;
    }
    // Deserialize subnet data
    const data = accountInfo.data;
    return {
      id: data.readUInt16LE(0),
      governor: new PublicKey(data.slice(2, 34)),
      maxNeurons: data[34],
      validatorLimit: data[35],
      incentiveFunctionHash: data.slice(36, 68),
      emissionRate: data.readBigUInt64LE(68),
      createdAt: data.readBigInt64LE(76),
      neuronCount: data.readUInt16LE(84),
    };
  }

  async getNeuron(neuronPda: PublicKey): Promise<any> {
    const accountInfo = await this.connection.getAccountInfo(neuronPda);
    if (!accountInfo) {
      return null;
    }
    // Deserialize neuron data
    const data = accountInfo.data;
    return {
      uid: data.readUInt16LE(0),
      subnetId: data.readUInt16LE(2),
      hotkey: new PublicKey(data.slice(4, 36)),
      coldkey: new PublicKey(data.slice(36, 68)),
      stake: data.readBigUInt64LE(68),
      rank: data.readBigUInt64LE(76),
      trust: data.readBigUInt64LE(84),
      incentive: data.readBigUInt64LE(92),
      validatorTrust: data.readBigUInt64LE(100),
      isValidator: data[108] !== 0,
      immunityUntil: data.readBigInt64LE(109),
      registeredAt: data.readBigInt64LE(117),
    };
  }
}


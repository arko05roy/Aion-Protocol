/**
 * Synapse message types for AIon Protocol
 */

export interface Synapse {
    version: string;
    subnet_id: number;
    task_id: string;
    task_type: TaskType;
    payload: {
        input: any;
        parameters: Record<string, any>;
    };
    metadata: {
        validator_uid: number;
        validator_hotkey: string;
        timestamp: number;
        timeout: number;
        nonce: string;
    };
    signature: string;
}

export interface SynapseResponse {
    task_id: string;
    subnet_id: number;
    miner_uid: number;
    miner_hotkey: string;
    result: {
        output: any;
        metrics: {
            latency_ms: number;
            confidence?: number;
            quality_score?: number;
            model_version?: string;
        };
    };
    timestamp: number;
    signature: string;
}

export enum TaskType {
    INFERENCE = "inference",
    EMBEDDING = "embedding",
    CLASSIFICATION = "classification",
    GENERATION = "generation",
    LABELING = "labeling",
    ANNOTATION = "annotation",
    FILTERING = "filtering",
    TRAINING = "training",
    OPTIMIZATION = "optimization",
}


# Proof-of-Intelligence Protocol Specification

## Version: 1.0.0

This document defines the complete protocol specification for the Proof-of-Intelligence (PoI) Protocol, including the Synapse communication protocol, message formats, and interaction flows.

---

## 1. Protocol Overview

The PoI Protocol enables decentralized coordination between **miners** (producers of AI work) and **validators** (evaluators of AI work) through a standardized communication protocol called **Synapse**.

### 1.1 Core Components

- **Axon**: Server endpoint deployed by miners to receive and process tasks
- **Dendrite**: Client library used by validators to send tasks and collect responses
- **Synapse**: Structured message format for task requests and responses
- **Solana Programs**: On-chain consensus, staking, and emission distribution

---

## 2. Synapse Message Format

### 2.1 Synapse Request

A Synapse request is sent by a validator (via Dendrite) to a miner (via Axon) to request AI work.

```typescript
interface Synapse {
    // Protocol metadata
    version: string;                 // Protocol version (e.g., "1.0.0")
    subnet_id: number;               // Target subnet identifier (u16)
    task_id: string;                 // Unique task identifier (UUID v4)
    
    // Task specification
    task_type: TaskType;              // Type of AI task to perform
    payload: {
        input: any;                  // Task-specific input data
        parameters: Record<string, any>; // Model/config parameters
    };
    
    // Request metadata
    metadata: {
        validator_uid: number;        // Sender validator UID (u16)
        validator_hotkey: string;     // Validator's Solana public key
        timestamp: number;           // Request timestamp (Unix, ms)
        timeout: number;             // Response timeout (milliseconds)
        nonce: string;               // Request nonce for replay protection
    };
    
    // Authentication
    signature: string;                // Validator's signature of the request
}
```

### 2.2 Synapse Response

A Synapse response is returned by a miner (via Axon) to a validator (via Dendrite) with the task results.

```typescript
interface SynapseResponse {
    // Response metadata
    task_id: string;                 // Original task identifier
    subnet_id: number;               // Subnet identifier
    miner_uid: number;               // Miner UID (u16)
    miner_hotkey: string;            // Miner's Solana public key
    
    // Task result
    result: {
        output: any;                 // Task-specific output data
        metrics: {
            latency_ms: number;      // Processing latency
            confidence?: number;      // Confidence score (0-1, optional)
            quality_score?: number;  // Quality score (0-10000, optional)
            model_version?: string;  // Model version used (optional)
        };
    };
    
    // Response metadata
    timestamp: number;                // Response timestamp (Unix, ms)
    
    // Authentication
    signature: string;                // Miner's signature of the response
}
```

### 2.3 Task Types

```typescript
enum TaskType {
    // Model Inference
    INFERENCE = "inference",           // Text generation, completion
    EMBEDDING = "embedding",           // Vector embeddings
    CLASSIFICATION = "classification", // Classification tasks
    GENERATION = "generation",         // Content generation
    
    // Data Processing
    LABELING = "labeling",            // Data labeling
    ANNOTATION = "annotation",        // Data annotation
    FILTERING = "filtering",         // Data filtering
    
    // Training & Optimization
    TRAINING_STEP = "training_step",  // Training iteration
    OPTIMIZATION = "optimization",     // Hyperparameter optimization
    
    // Custom
    CUSTOM = "custom",                // Subnet-specific tasks
}
```

---

## 3. Communication Protocol

### 3.1 Transport Layer

- **Protocol**: HTTP/1.1 or HTTP/2
- **Method**: POST for task requests
- **Content-Type**: `application/json`
- **Authentication**: Solana signature verification

### 3.2 Axon Endpoints

#### 3.2.1 POST /synapse

Receive and process a Synapse task request.

**Request:**
```http
POST /synapse HTTP/1.1
Host: <axon-endpoint>
Content-Type: application/json

{
  "version": "1.0.0",
  "subnet_id": 1,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "task_type": "inference",
  "payload": {
    "input": "...",
    "parameters": {}
  },
  "metadata": {
    "validator_uid": 5,
    "validator_hotkey": "...",
    "timestamp": 1234567890000,
    "timeout": 30000,
    "nonce": "..."
  },
  "signature": "..."
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "subnet_id": 1,
  "miner_uid": 10,
  "miner_hotkey": "...",
  "result": {
    "output": "...",
    "metrics": {
      "latency_ms": 250,
      "confidence": 0.95
    }
  },
  "timestamp": 1234567890250,
  "signature": "..."
}
```

**Response (Error):**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "InvalidSynapse",
  "message": "Task type not supported",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 3.2.2 GET /health

Health check endpoint.

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "miner_uid": 10,
  "subnet_id": 1,
  "supported_task_types": ["inference", "embedding"],
  "uptime_seconds": 3600
}
```

#### 3.2.3 GET /capabilities

Advertise supported task types and capabilities.

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "miner_uid": 10,
  "subnet_id": 1,
  "capabilities": {
    "task_types": ["inference", "embedding"],
    "models": ["gpt-4", "bert-base"],
    "max_input_length": 4096,
    "max_batch_size": 32
  }
}
```

### 3.3 Authentication

#### 3.3.1 Request Signing

Validators sign Synapse requests using their hotkey:

```typescript
// Pseudocode
const message = JSON.stringify({
    version,
    subnet_id,
    task_id,
    task_type,
    payload,
    metadata: {
        validator_uid,
        validator_hotkey,
        timestamp,
        timeout,
        nonce
    }
});

const signature = await signer.signMessage(message);
```

#### 3.3.2 Response Signing

Miners sign Synapse responses using their hotkey:

```typescript
// Pseudocode
const message = JSON.stringify({
    task_id,
    subnet_id,
    miner_uid,
    miner_hotkey,
    result,
    timestamp
});

const signature = await signer.signMessage(message);
```

#### 3.3.3 Signature Verification

Both parties verify signatures using Solana's `ed25519` signature verification:

```rust
// Pseudocode
pub fn verify_signature(
    message: &[u8],
    signature: &[u8; 64],
    public_key: &Pubkey,
) -> bool {
    // Use Solana's ed25519 verification
    public_key.verify(message, signature)
}
```

---

## 4. Communication Flow

### 4.1 Standard Task Flow

```
┌──────────┐                    ┌──────────┐
│ Validator│                    │   Miner  │
│(Dendrite)│                    │  (Axon) │
└────┬─────┘                    └────┬─────┘
     │                               │
     │ 1. POST /synapse              │
     │    (Synapse Request)           │
     ├──────────────────────────────>│
     │                               │
     │                   2. Process Task
     │                   3. Generate Result
     │                               │
     │ 4. 200 OK                     │
     │    (Synapse Response)         │
     │<──────────────────────────────┤
     │                               │
     │ 5. Evaluate Result            │
     │ 6. Calculate Weight           │
     │                               │
```

### 4.2 Batch Task Flow

Validators can send multiple tasks in parallel:

```
Validator sends N tasks → Miner processes in parallel → Returns N responses
```

### 4.3 Error Handling

- **Timeout**: If miner doesn't respond within `metadata.timeout`, validator marks task as failed
- **Invalid Request**: Miner returns 400 with error details
- **Rate Limiting**: Miner returns 429 if rate limit exceeded
- **Network Errors**: Validator retries with exponential backoff

---

## 5. Discovery Mechanism

### 5.1 On-Chain Discovery

Validators discover miners via on-chain Registry Program:

1. Query Registry Program for active neurons in subnet
2. Filter by `is_validator = false` to get miners
3. Retrieve Axon endpoints (stored off-chain or in separate registry)

### 5.2 Axon Endpoint Storage

Axon endpoints can be stored:

- **Option 1**: In a separate on-chain registry (IP address or domain)
- **Option 2**: In a decentralized registry (IPFS, Arweave)
- **Option 3**: Via DNS records (e.g., `axon-{uid}.poi.network`)

### 5.3 Endpoint Format

```
http://<ip-or-domain>:<port>/synapse
https://<domain>/synapse
```

---

## 6. Weight Submission Flow

After collecting responses, validators:

1. **Evaluate** responses using subnet-specific incentive function
2. **Calculate** weights (0-10000 scale) for each miner
3. **Submit** weights to Consensus Program on-chain
4. **Wait** for consensus finalization
5. **Receive** emissions based on consensus alignment

### 6.1 Weight Calculation

```typescript
interface WeightCalculation {
    miner_uid: number;
    weight: number;  // 0-10000, normalized
    metrics: {
        accuracy?: number;
        latency_score?: number;
        quality_score?: number;
        // Subnet-specific metrics
    };
}
```

---

## 7. Protocol Versioning

### 7.1 Version Format

Semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes to message format
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### 7.2 Version Negotiation

- Validators specify `version` in Synapse request
- Miners must support requested version or return error
- Miners advertise supported versions in `/capabilities`

---

## 8. Security Considerations

### 8.1 Replay Protection

- Each request includes a `nonce` in metadata
- Validators track used nonces per validator-miner pair
- Miners reject duplicate nonces

### 8.2 Rate Limiting

- Miners implement per-validator rate limits
- Validators respect miner rate limits
- Rate limit info in `/capabilities` response

### 8.3 Input Validation

- Miners validate all input data
- Validators validate all response data
- Both parties verify signatures

### 8.4 Timeout Handling

- Validators set appropriate timeouts
- Miners respect timeout constraints
- Failed tasks don't affect consensus

---

## 9. Example Implementations

### 9.1 TypeScript/JavaScript

```typescript
import { Synapse, SynapseResponse } from '@poi/sdk';

// Validator (Dendrite)
const synapse: Synapse = {
    version: "1.0.0",
    subnet_id: 1,
    task_id: generateUUID(),
    task_type: "inference",
    payload: {
        input: "Hello, world!",
        parameters: { temperature: 0.7 }
    },
    metadata: {
        validator_uid: 5,
        validator_hotkey: validatorKeypair.publicKey.toString(),
        timestamp: Date.now(),
        timeout: 30000,
        nonce: generateNonce()
    },
    signature: await signSynapse(synapse, validatorKeypair)
};

const response = await fetch(`${minerAxonUrl}/synapse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(synapse)
});

const result: SynapseResponse = await response.json();
```

### 9.2 Rust

```rust
use poi_sdk::synapse::{Synapse, SynapseResponse};

// Miner (Axon)
async fn handle_synapse(synapse: Synapse) -> Result<SynapseResponse> {
    // Verify signature
    verify_signature(&synapse)?;
    
    // Process task
    let result = process_task(&synapse).await?;
    
    // Create response
    let response = SynapseResponse {
        task_id: synapse.task_id,
        subnet_id: synapse.subnet_id,
        miner_uid: self.uid,
        miner_hotkey: self.hotkey.to_string(),
        result,
        timestamp: current_timestamp(),
        signature: sign_response(&response, &self.keypair)?,
    };
    
    Ok(response)
}
```

---

## 10. Protocol Extensions

### 10.1 Streaming Responses

For long-running tasks, support Server-Sent Events (SSE) or WebSocket streaming.

### 10.2 Batch Requests

Support multiple tasks in a single request for efficiency.

### 10.3 Caching

Miners can cache identical requests and return cached results.

---

## Appendix A: Message Schema (JSON Schema)

See `schemas/synapse.json` and `schemas/synapse-response.json` for complete JSON schemas.

---

## Appendix B: Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `InvalidSynapse` | Invalid Synapse request format | Malformed request |
| `UnsupportedTaskType` | Task type not supported | Miner doesn't support task type |
| `InvalidSignature` | Signature verification failed | Authentication failed |
| `RateLimitExceeded` | Rate limit exceeded | Too many requests |
| `Timeout` | Request timeout | Miner didn't respond in time |
| `InternalError` | Internal server error | Miner processing error |

---

**End of Protocol Specification**


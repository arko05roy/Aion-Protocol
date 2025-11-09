use solana_program::program_error::ProgramError;

#[derive(Debug, Clone)]
pub enum RegistryInstruction {
    CreateSubnet {
        subnet_id: u16,
        max_neurons: u8,
        validator_limit: u8,
        emission_rate: u64,
        incentive_function_hash: [u8; 32],
    },
    RegisterNeuron {
        subnet_id: u16,
    },
    UpdateSubnetConfig {
        max_neurons: Option<u8>,
        validator_limit: Option<u8>,
        emission_rate: Option<u64>,
        incentive_function_hash: Option<[u8; 32]>,
    },
    PruneNeuron {
        subnet_id: u16,
        uid: u16,
    },
    UpdateNeuronStatus {
        rank: Option<u64>,
        trust: Option<u64>,
        incentive: Option<u64>,
        validator_trust: Option<u64>,
        is_validator: Option<bool>,
    },
}

impl RegistryInstruction {
    pub fn try_from_slice(data: &[u8]) -> Result<Self, ProgramError> {
        if data.is_empty() {
            return Err(ProgramError::InvalidInstructionData);
        }

        let instruction = data[0];
        let data = &data[1..];

        match instruction {
            0 => {
                // CreateSubnet
                if data.len() < 2 + 1 + 1 + 8 + 32 {
                    return Err(ProgramError::InvalidInstructionData);
                }
                let subnet_id = u16::from_le_bytes([data[0], data[1]]);
                let max_neurons = data[2];
                let validator_limit = data[3];
                let emission_rate = u64::from_le_bytes(data[4..12].try_into().unwrap());
                let mut hash = [0u8; 32];
                hash.copy_from_slice(&data[12..44]);
                Ok(RegistryInstruction::CreateSubnet {
                    subnet_id,
                    max_neurons,
                    validator_limit,
                    emission_rate,
                    incentive_function_hash: hash,
                })
            }
            1 => {
                // RegisterNeuron
                if data.len() < 2 {
                    return Err(ProgramError::InvalidInstructionData);
                }
                let subnet_id = u16::from_le_bytes([data[0], data[1]]);
                Ok(RegistryInstruction::RegisterNeuron { subnet_id })
            }
            2 => {
                // UpdateSubnetConfig
                let mut offset = 0;
                let max_neurons = if data.len() > offset && data[offset] != 0 {
                    offset += 1;
                    Some(data[offset - 1])
                } else {
                    offset += 1;
                    None
                };
                let validator_limit = if data.len() > offset && data[offset] != 0 {
                    offset += 1;
                    Some(data[offset - 1])
                } else {
                    offset += 1;
                    None
                };
                let emission_rate = if data.len() > offset + 8 && data[offset] != 0 {
                    let val = u64::from_le_bytes(data[offset + 1..offset + 9].try_into().unwrap());
                    offset += 9;
                    Some(val)
                } else {
                    offset += 1;
                    None
                };
                let incentive_function_hash = if data.len() > offset + 32 && data[offset] != 0 {
                    let mut hash = [0u8; 32];
                    hash.copy_from_slice(&data[offset + 1..offset + 33]);
                    offset += 33;
                    Some(hash)
                } else {
                    offset += 1;
                    None
                };
                Ok(RegistryInstruction::UpdateSubnetConfig {
                    max_neurons,
                    validator_limit,
                    emission_rate,
                    incentive_function_hash,
                })
            }
            3 => {
                // PruneNeuron
                if data.len() < 4 {
                    return Err(ProgramError::InvalidInstructionData);
                }
                let subnet_id = u16::from_le_bytes([data[0], data[1]]);
                let uid = u16::from_le_bytes([data[2], data[3]]);
                Ok(RegistryInstruction::PruneNeuron { subnet_id, uid })
            }
            4 => {
                // UpdateNeuronStatus
                let mut offset = 0;
                let rank = if data.len() > offset + 8 && data[offset] != 0 {
                    let val = u64::from_le_bytes(data[offset + 1..offset + 9].try_into().unwrap());
                    offset += 9;
                    Some(val)
                } else {
                    offset += 1;
                    None
                };
                let trust = if data.len() > offset + 8 && data[offset] != 0 {
                    let val = u64::from_le_bytes(data[offset + 1..offset + 9].try_into().unwrap());
                    offset += 9;
                    Some(val)
                } else {
                    offset += 1;
                    None
                };
                let incentive = if data.len() > offset + 8 && data[offset] != 0 {
                    let val = u64::from_le_bytes(data[offset + 1..offset + 9].try_into().unwrap());
                    offset += 9;
                    Some(val)
                } else {
                    offset += 1;
                    None
                };
                let validator_trust = if data.len() > offset + 8 && data[offset] != 0 {
                    let val = u64::from_le_bytes(data[offset + 1..offset + 9].try_into().unwrap());
                    offset += 9;
                    Some(val)
                } else {
                    offset += 1;
                    None
                };
                let is_validator = if data.len() > offset && data[offset] != 0 {
                    offset += 1;
                    Some(data[offset - 1] != 0)
                } else {
                    offset += 1;
                    None
                };
                Ok(RegistryInstruction::UpdateNeuronStatus {
                    rank,
                    trust,
                    incentive,
                    validator_trust,
                    is_validator,
                })
            }
            _ => Err(ProgramError::InvalidInstructionData),
        }
    }
}


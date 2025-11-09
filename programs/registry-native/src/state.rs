use solana_program::{
    program_error::ProgramError,
    pubkey::Pubkey,
};

pub const SUBNET_LEN: usize = 2 + 32 + 1 + 1 + 32 + 8 + 8 + 2; // 86 bytes
pub const NEURON_LEN: usize = 2 + 2 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8; // 125 bytes

#[derive(Debug, Clone)]
pub struct Subnet {
    pub id: u16,
    pub governor: Pubkey,
    pub max_neurons: u8,
    pub validator_limit: u8,
    pub incentive_function_hash: [u8; 32],
    pub emission_rate: u64,
    pub created_at: i64,
    pub neuron_count: u16,
}

impl Subnet {
    pub fn serialize(&self, data: &mut [u8]) -> Result<(), ProgramError> {
        if data.len() < SUBNET_LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut offset = 0;
        data[offset..offset + 2].copy_from_slice(&self.id.to_le_bytes());
        offset += 2;
        data[offset..offset + 32].copy_from_slice(self.governor.as_ref());
        offset += 32;
        data[offset] = self.max_neurons;
        offset += 1;
        data[offset] = self.validator_limit;
        offset += 1;
        data[offset..offset + 32].copy_from_slice(&self.incentive_function_hash);
        offset += 32;
        data[offset..offset + 8].copy_from_slice(&self.emission_rate.to_le_bytes());
        offset += 8;
        data[offset..offset + 8].copy_from_slice(&self.created_at.to_le_bytes());
        offset += 8;
        data[offset..offset + 2].copy_from_slice(&self.neuron_count.to_le_bytes());

        Ok(())
    }

    pub fn deserialize(data: &[u8]) -> Result<Self, ProgramError> {
        if data.len() < SUBNET_LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut offset = 0;
        let id = u16::from_le_bytes([data[offset], data[offset + 1]]);
        offset += 2;
        if data.len() < offset + 32 {
            return Err(ProgramError::InvalidAccountData);
        }
        let governor = Pubkey::try_from(&data[offset..offset + 32])
            .map_err(|_| ProgramError::InvalidAccountData)?;
        offset += 32;
        let max_neurons = data[offset];
        offset += 1;
        let validator_limit = data[offset];
        offset += 1;
        let mut incentive_function_hash = [0u8; 32];
        incentive_function_hash.copy_from_slice(&data[offset..offset + 32]);
        offset += 32;
        let emission_rate = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let created_at = i64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let neuron_count = u16::from_le_bytes([data[offset], data[offset + 1]]);

        Ok(Subnet {
            id,
            governor,
            max_neurons,
            validator_limit,
            incentive_function_hash,
            emission_rate,
            created_at,
            neuron_count,
        })
    }
}

#[derive(Debug, Clone)]
pub struct Neuron {
    pub uid: u16,
    pub subnet_id: u16,
    pub hotkey: Pubkey,
    pub coldkey: Pubkey,
    pub stake: u64,
    pub rank: u64,
    pub trust: u64,
    pub incentive: u64,
    pub validator_trust: u64,
    pub is_validator: bool,
    pub immunity_until: i64,
    pub registered_at: i64,
}

impl Neuron {
    pub fn serialize(&self, data: &mut [u8]) -> Result<(), ProgramError> {
        if data.len() < NEURON_LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut offset = 0;
        data[offset..offset + 2].copy_from_slice(&self.uid.to_le_bytes());
        offset += 2;
        data[offset..offset + 2].copy_from_slice(&self.subnet_id.to_le_bytes());
        offset += 2;
        data[offset..offset + 32].copy_from_slice(self.hotkey.as_ref());
        offset += 32;
        data[offset..offset + 32].copy_from_slice(self.coldkey.as_ref());
        offset += 32;
        data[offset..offset + 8].copy_from_slice(&self.stake.to_le_bytes());
        offset += 8;
        data[offset..offset + 8].copy_from_slice(&self.rank.to_le_bytes());
        offset += 8;
        data[offset..offset + 8].copy_from_slice(&self.trust.to_le_bytes());
        offset += 8;
        data[offset..offset + 8].copy_from_slice(&self.incentive.to_le_bytes());
        offset += 8;
        data[offset..offset + 8].copy_from_slice(&self.validator_trust.to_le_bytes());
        offset += 8;
        data[offset] = if self.is_validator { 1 } else { 0 };
        offset += 1;
        data[offset..offset + 8].copy_from_slice(&self.immunity_until.to_le_bytes());
        offset += 8;
        data[offset..offset + 8].copy_from_slice(&self.registered_at.to_le_bytes());

        Ok(())
    }

    pub fn deserialize(data: &[u8]) -> Result<Self, ProgramError> {
        if data.len() < NEURON_LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut offset = 0;
        let uid = u16::from_le_bytes([data[offset], data[offset + 1]]);
        offset += 2;
        let subnet_id = u16::from_le_bytes([data[offset], data[offset + 1]]);
        offset += 2;
        if data.len() < offset + 32 {
            return Err(ProgramError::InvalidAccountData);
        }
        let hotkey = Pubkey::try_from(&data[offset..offset + 32])
            .map_err(|_| ProgramError::InvalidAccountData)?;
        offset += 32;
        if data.len() < offset + 32 {
            return Err(ProgramError::InvalidAccountData);
        }
        let coldkey = Pubkey::try_from(&data[offset..offset + 32])
            .map_err(|_| ProgramError::InvalidAccountData)?;
        offset += 32;
        let stake = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let rank = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let trust = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let incentive = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let validator_trust = u64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let is_validator = data[offset] != 0;
        offset += 1;
        let immunity_until = i64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let registered_at = i64::from_le_bytes(data[offset..offset + 8].try_into().unwrap());

        Ok(Neuron {
            uid,
            subnet_id,
            hotkey,
            coldkey,
            stake,
            rank,
            trust,
            incentive,
            validator_trust,
            is_validator,
            immunity_until,
            registered_at,
        })
    }
}


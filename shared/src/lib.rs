use anchor_lang::prelude::*;

/// Shared data structures for cross-program communication
/// These match the Registry program's Neuron structure
#[derive(Clone, Copy)]
pub struct NeuronData {
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

impl NeuronData {
    pub const LEN: usize = 2 + 2 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8;

    /// Deserialize neuron data from account
    pub fn from_account_info(account_info: &AccountInfo) -> Result<Self> {
        let data = account_info.try_borrow_data()?;
        let mut data_slice = data.as_ref();
        
        // Skip discriminator (8 bytes)
        data_slice = &data_slice[8..];
        
        let uid = u16::from_le_bytes([data_slice[0], data_slice[1]]);
        let subnet_id = u16::from_le_bytes([data_slice[2], data_slice[3]]);
        let hotkey = Pubkey::try_from(&data_slice[4..36])?;
        let coldkey = Pubkey::try_from(&data_slice[36..68])?;
        let stake = u64::from_le_bytes(data_slice[68..76].try_into().unwrap());
        let rank = u64::from_le_bytes(data_slice[76..84].try_into().unwrap());
        let trust = u64::from_le_bytes(data_slice[84..92].try_into().unwrap());
        let incentive = u64::from_le_bytes(data_slice[92..100].try_into().unwrap());
        let validator_trust = u64::from_le_bytes(data_slice[100..108].try_into().unwrap());
        let is_validator = data_slice[108] != 0;
        let immunity_until = i64::from_le_bytes(data_slice[109..117].try_into().unwrap());
        let registered_at = i64::from_le_bytes(data_slice[117..125].try_into().unwrap());
        
        Ok(Self {
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


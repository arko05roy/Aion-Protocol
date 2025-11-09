use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::{clock::Clock, Sysvar},
};

pub mod error;
pub mod instruction;
pub mod state;

pub use error::RegistryError;
pub use instruction::RegistryInstruction;
pub use state::{Neuron, Subnet};

// Program ID - Deployment address for testnet
solana_program::declare_id!("iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u");

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = RegistryInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        RegistryInstruction::CreateSubnet {
            subnet_id,
            max_neurons,
            validator_limit,
            emission_rate,
            incentive_function_hash,
        } => {
            process_create_subnet(
                program_id,
                accounts,
                subnet_id,
                max_neurons,
                validator_limit,
                emission_rate,
                incentive_function_hash,
            )
        }
        RegistryInstruction::RegisterNeuron { subnet_id } => {
            process_register_neuron(program_id, accounts, subnet_id)
        }
        RegistryInstruction::UpdateSubnetConfig {
            max_neurons,
            validator_limit,
            emission_rate,
            incentive_function_hash,
        } => process_update_subnet_config(accounts, max_neurons, validator_limit, emission_rate, incentive_function_hash),
        RegistryInstruction::PruneNeuron { subnet_id, uid } => {
            process_prune_neuron(program_id, accounts, subnet_id, uid)
        }
        RegistryInstruction::UpdateNeuronStatus {
            rank,
            trust,
            incentive,
            validator_trust,
            is_validator,
        } => process_update_neuron_status(accounts, rank, trust, incentive, validator_trust, is_validator),
    }
}

fn process_create_subnet(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    subnet_id: u16,
    max_neurons: u8,
    validator_limit: u8,
    emission_rate: u64,
    incentive_function_hash: [u8; 32],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let subnet_account = next_account_info(accounts_iter)?;
    let governor = next_account_info(accounts_iter)?;
    let _system_program = next_account_info(accounts_iter)?;

    // Validate inputs
    if max_neurons > 255 {
        return Err(RegistryError::InvalidMaxNeurons.into());
    }
    if validator_limit > max_neurons {
        return Err(RegistryError::InvalidValidatorLimit.into());
    }

    // Verify governor is signer
    if !governor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify program ownership
    if subnet_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Derive PDA for subnet
    let (expected_subnet_pubkey, _bump) = Pubkey::find_program_address(
        &[b"subnet", &subnet_id.to_le_bytes()],
        program_id,
    );

    if *subnet_account.key != expected_subnet_pubkey {
        return Err(ProgramError::InvalidAccountData);
    }

    // Initialize subnet account
    let clock = Clock::get()?;
    let subnet = Subnet {
        id: subnet_id,
        governor: *governor.key,
        max_neurons,
        validator_limit,
        incentive_function_hash,
        emission_rate,
        created_at: clock.unix_timestamp,
        neuron_count: 0,
    };

    // Serialize and write to account
    let mut data = subnet_account.try_borrow_mut_data()?;
    subnet.serialize(&mut data)?;

    solana_program::msg!("Subnet {} created by governor {}", subnet_id, governor.key);

    Ok(())
}

fn process_register_neuron(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    subnet_id: u16,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let subnet_account = next_account_info(accounts_iter)?;
    let neuron_account = next_account_info(accounts_iter)?;
    let hotkey = next_account_info(accounts_iter)?;
    let coldkey = next_account_info(accounts_iter)?;
    let _system_program = next_account_info(accounts_iter)?;

    // Verify hotkey is signer
    if !hotkey.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Deserialize subnet
    let subnet_data = subnet_account.try_borrow_data()?;
    let mut subnet = Subnet::deserialize(&subnet_data)?;

    // Validate subnet
    if subnet.id != subnet_id {
        return Err(RegistryError::InvalidSubnet.into());
    }

    // Check if subnet is full
    if subnet.neuron_count >= subnet.max_neurons as u16 {
        return Err(RegistryError::SubnetFull.into());
    }

    // Derive PDA for neuron
    let (expected_neuron_pubkey, _bump) = Pubkey::find_program_address(
        &[b"neuron", &subnet_id.to_le_bytes(), hotkey.key.as_ref()],
        program_id,
    );

    if *neuron_account.key != expected_neuron_pubkey {
        return Err(ProgramError::InvalidAccountData);
    }

    // Check if neuron already exists (uid == 0 means not registered)
    let neuron_data = neuron_account.try_borrow_data()?;
    if neuron_data.len() >= 8 {
        let existing_neuron = Neuron::deserialize(&neuron_data);
        if existing_neuron.is_ok() && existing_neuron.as_ref().unwrap().uid != 0 {
            return Err(RegistryError::NeuronAlreadyRegistered.into());
        }
    }

    // Assign UID
    let uid = subnet.neuron_count + 1;

    // Create neuron
    let clock = Clock::get()?;
    let neuron = Neuron {
        uid,
        subnet_id,
        hotkey: *hotkey.key,
        coldkey: *coldkey.key,
        stake: 0,
        rank: 0,
        trust: 0,
        incentive: 0,
        validator_trust: 0,
        is_validator: false,
        immunity_until: clock.unix_timestamp + 86400, // 24 hour immunity
        registered_at: clock.unix_timestamp,
    };

    // Serialize and write to account
    let mut data = neuron_account.try_borrow_mut_data()?;
    neuron.serialize(&mut data)?;

    // Update subnet neuron count
    subnet.neuron_count += 1;
    let mut subnet_data = subnet_account.try_borrow_mut_data()?;
    subnet.serialize(&mut subnet_data)?;

    solana_program::msg!("Neuron {} registered in subnet {} with UID {}", hotkey.key, subnet_id, uid);

    Ok(())
}

fn process_update_subnet_config(
    accounts: &[AccountInfo],
    max_neurons: Option<u8>,
    validator_limit: Option<u8>,
    emission_rate: Option<u64>,
    incentive_function_hash: Option<[u8; 32]>,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let subnet_account = next_account_info(accounts_iter)?;
    let governor = next_account_info(accounts_iter)?;

    // Verify governor is signer
    if !governor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Deserialize subnet
    let subnet_data = subnet_account.try_borrow_data()?;
    let mut subnet = Subnet::deserialize(&subnet_data)?;

    // Verify governor matches
    if subnet.governor != *governor.key {
        return Err(RegistryError::Unauthorized.into());
    }

    // Update fields
        if let Some(max) = max_neurons {
            if max > 255 || max < subnet.neuron_count as u8 {
                return Err(RegistryError::InvalidMaxNeurons.into());
            }
        subnet.max_neurons = max;
    }

    if let Some(limit) = validator_limit {
        if limit > subnet.max_neurons {
            return Err(RegistryError::InvalidValidatorLimit.into());
        }
        subnet.validator_limit = limit;
    }

    if let Some(rate) = emission_rate {
        subnet.emission_rate = rate;
    }

    if let Some(hash) = incentive_function_hash {
        subnet.incentive_function_hash = hash;
    }

    // Serialize back
    let mut data = subnet_account.try_borrow_mut_data()?;
    subnet.serialize(&mut data)?;

    solana_program::msg!("Subnet {} configuration updated", subnet.id);

    Ok(())
}

fn process_prune_neuron(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    subnet_id: u16,
    uid: u16,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let subnet_account = next_account_info(accounts_iter)?;
    let neuron_account = next_account_info(accounts_iter)?;
    let authority = next_account_info(accounts_iter)?;
    let consensus_program = next_account_info(accounts_iter)?;

    // Verify authority is signer
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Deserialize subnet and neuron
    let subnet_data = subnet_account.try_borrow_data()?;
    let subnet = Subnet::deserialize(&subnet_data)?;

    let mut neuron_data = neuron_account.try_borrow_mut_data()?;
    let mut neuron = Neuron::deserialize(&neuron_data)?;

    // Validate
    if neuron.subnet_id != subnet_id || neuron.uid != uid {
        return Err(RegistryError::InvalidNeuron.into());
    }

    // Check immunity
    let clock = Clock::get()?;
    if clock.unix_timestamp <= neuron.immunity_until {
        return Err(RegistryError::NeuronImmune.into());
    }

    // Verify authority (governor or consensus program)
    if *authority.key != subnet.governor && *authority.key != *consensus_program.key {
        return Err(RegistryError::Unauthorized.into());
    }

    // Reset neuron
    neuron.uid = 0;
    neuron.rank = 0;
    neuron.trust = 0;
    neuron.incentive = 0;
    neuron.validator_trust = 0;
    neuron.is_validator = false;

    // Serialize back
    neuron.serialize(&mut neuron_data)?;

    // Update subnet count
    let mut subnet_data = subnet_account.try_borrow_mut_data()?;
    let mut subnet = Subnet::deserialize(&subnet_data)?;
    subnet.neuron_count = subnet.neuron_count.saturating_sub(1);
    subnet.serialize(&mut subnet_data)?;

    solana_program::msg!("Neuron {} pruned from subnet {}", uid, subnet_id);

    Ok(())
}

fn process_update_neuron_status(
    accounts: &[AccountInfo],
    rank: Option<u64>,
    trust: Option<u64>,
    incentive: Option<u64>,
    validator_trust: Option<u64>,
    is_validator: Option<bool>,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let neuron_account = next_account_info(accounts_iter)?;
    let authority = next_account_info(accounts_iter)?;
    let consensus_program = next_account_info(accounts_iter)?;
    let staking_program = next_account_info(accounts_iter)?;

    // Verify authority is signer
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify authority is consensus or staking program
    if *authority.key != *consensus_program.key && *authority.key != *staking_program.key {
        return Err(RegistryError::Unauthorized.into());
    }

    // Deserialize neuron
    let mut neuron_data = neuron_account.try_borrow_mut_data()?;
    let mut neuron = Neuron::deserialize(&neuron_data)?;

    // Update fields
    if let Some(r) = rank {
        neuron.rank = r;
    }
    if let Some(t) = trust {
        neuron.trust = t;
    }
    if let Some(i) = incentive {
        neuron.incentive = i;
    }
    if let Some(vt) = validator_trust {
        neuron.validator_trust = vt;
    }
    if let Some(iv) = is_validator {
        neuron.is_validator = iv;
    }

    // Serialize back
    neuron.serialize(&mut neuron_data)?;

    Ok(())
}


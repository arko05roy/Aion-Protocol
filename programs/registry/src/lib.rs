use anchor_lang::prelude::*;

declare_id!("poiRegistry1111111111111111111111111");

#[program]
pub mod poi_registry {
    use super::*;

    /// Initialize a new subnet with the given parameters
    pub fn create_subnet(
        ctx: Context<CreateSubnet>,
        subnet_id: u16,
        max_neurons: u8,
        validator_limit: u8,
        emission_rate: u64,
        incentive_function_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            max_neurons <= 256,
            RegistryError::InvalidMaxNeurons
        );
        require!(
            validator_limit <= max_neurons,
            RegistryError::InvalidValidatorLimit
        );

        let subnet = &mut ctx.accounts.subnet;
        subnet.id = subnet_id;
        subnet.governor = ctx.accounts.governor.key();
        subnet.max_neurons = max_neurons;
        subnet.validator_limit = validator_limit;
        subnet.emission_rate = emission_rate;
        subnet.incentive_function_hash = incentive_function_hash;
        subnet.created_at = Clock::get()?.unix_timestamp;
        subnet.neuron_count = 0;

        msg!("Subnet {} created by governor {}", subnet_id, subnet.governor);

        Ok(())
    }

    /// Register a new neuron in a subnet
    /// Requires PoW or burn proof (handled off-chain, verified on-chain)
    pub fn register_neuron(
        ctx: Context<RegisterNeuron>,
        subnet_id: u16,
    ) -> Result<()> {
        let subnet = &mut ctx.accounts.subnet;
        require!(
            subnet.neuron_count < subnet.max_neurons as u16,
            RegistryError::SubnetFull
        );

        // Check if neuron already exists
        require!(
            ctx.accounts.neuron.uid == 0,
            RegistryError::NeuronAlreadyRegistered
        );

        // Assign UID (next available)
        let uid = subnet.neuron_count + 1;
        
        let neuron = &mut ctx.accounts.neuron;
        neuron.uid = uid;
        neuron.subnet_id = subnet_id;
        neuron.hotkey = ctx.accounts.hotkey.key();
        neuron.coldkey = ctx.accounts.coldkey.key();
        neuron.stake = 0;
        neuron.rank = 0;
        neuron.trust = 0;
        neuron.incentive = 0;
        neuron.validator_trust = 0;
        neuron.is_validator = false;
        neuron.immunity_until = Clock::get()?.unix_timestamp + 86400; // 24 hour immunity
        neuron.registered_at = Clock::get()?.unix_timestamp;

        subnet.neuron_count += 1;

        msg!("Neuron {} registered in subnet {} with UID {}", 
             neuron.hotkey, subnet_id, uid);

        Ok(())
    }

    /// Update subnet configuration (governor only)
    pub fn update_subnet_config(
        ctx: Context<UpdateSubnetConfig>,
        max_neurons: Option<u8>,
        validator_limit: Option<u8>,
        emission_rate: Option<u64>,
        incentive_function_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        let subnet = &mut ctx.accounts.subnet;
        
        require!(
            ctx.accounts.governor.key() == subnet.governor,
            RegistryError::Unauthorized
        );

        if let Some(max) = max_neurons {
            require!(
                max <= 256 && max >= subnet.neuron_count as u8,
                RegistryError::InvalidMaxNeurons
            );
            subnet.max_neurons = max;
        }

        if let Some(limit) = validator_limit {
            require!(
                limit <= subnet.max_neurons,
                RegistryError::InvalidValidatorLimit
            );
            subnet.validator_limit = limit;
        }

        if let Some(rate) = emission_rate {
            subnet.emission_rate = rate;
        }

        if let Some(hash) = incentive_function_hash {
            subnet.incentive_function_hash = hash;
        }

        msg!("Subnet {} configuration updated", subnet.id);

        Ok(())
    }

    /// Prune a low-performing neuron (governor or consensus can call)
    pub fn prune_neuron(
        ctx: Context<PruneNeuron>,
        subnet_id: u16,
        uid: u16,
    ) -> Result<()> {
        let subnet = &mut ctx.accounts.subnet;
        let neuron = &mut ctx.accounts.neuron;

        require!(
            neuron.subnet_id == subnet_id && neuron.uid == uid,
            RegistryError::InvalidNeuron
        );

        // Check immunity period
        require!(
            Clock::get()?.unix_timestamp > neuron.immunity_until,
            RegistryError::NeuronImmune
        );

        // Only governor or consensus program can prune
        require!(
            ctx.accounts.authority.key() == subnet.governor 
            || ctx.accounts.authority.key() == ctx.accounts.consensus_program.key(),
            RegistryError::Unauthorized
        );

        // Reset neuron (can be reused)
        neuron.uid = 0;
        neuron.rank = 0;
        neuron.trust = 0;
        neuron.incentive = 0;
        neuron.validator_trust = 0;
        neuron.is_validator = false;

        subnet.neuron_count = subnet.neuron_count.saturating_sub(1);

        msg!("Neuron {} pruned from subnet {}", uid, subnet_id);

        Ok(())
    }

    /// Update neuron status (called by other programs)
    pub fn update_neuron_status(
        ctx: Context<UpdateNeuronStatus>,
        rank: Option<u64>,
        trust: Option<u64>,
        incentive: Option<u64>,
        validator_trust: Option<u64>,
        is_validator: Option<bool>,
    ) -> Result<()> {
        let neuron = &mut ctx.accounts.neuron;

        // Only consensus or staking programs can update
        require!(
            ctx.accounts.authority.key() == ctx.accounts.consensus_program.key()
            || ctx.accounts.authority.key() == ctx.accounts.staking_program.key(),
            RegistryError::Unauthorized
        );

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

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(subnet_id: u16)]
pub struct CreateSubnet<'info> {
    #[account(
        init,
        payer = governor,
        space = 8 + Subnet::LEN,
        seeds = [b"subnet", &subnet_id.to_le_bytes()],
        bump
    )]
    pub subnet: Account<'info, Subnet>,
    
    #[account(mut)]
    pub governor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subnet_id: u16)]
pub struct RegisterNeuron<'info> {
    #[account(
        seeds = [b"subnet", &subnet_id.to_le_bytes()],
        bump,
        has_one = governor @ RegistryError::InvalidSubnet
    )]
    pub subnet: Account<'info, Subnet>,
    
    #[account(
        init,
        payer = hotkey,
        space = 8 + Neuron::LEN,
        seeds = [b"neuron", &subnet_id.to_le_bytes(), hotkey.key().as_ref()],
        bump
    )]
    pub neuron: Account<'info, Neuron>,
    
    /// CHECK: Hotkey (miner/validator identity)
    pub hotkey: Signer<'info>,
    
    /// CHECK: Coldkey (owner/staking key)
    pub coldkey: UncheckedAccount<'info>,
    
    pub governor: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSubnetConfig<'info> {
    #[account(
        mut,
        has_one = governor @ RegistryError::Unauthorized
    )]
    pub subnet: Account<'info, Subnet>,
    
    pub governor: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(subnet_id: u16, uid: u16)]
pub struct PruneNeuron<'info> {
    #[account(
        seeds = [b"subnet", &subnet_id.to_le_bytes()],
        bump,
        has_one = governor @ RegistryError::InvalidSubnet
    )]
    pub subnet: Account<'info, Subnet>,
    
    #[account(
        mut,
        seeds = [b"neuron", &subnet_id.to_le_bytes(), neuron.hotkey.key().as_ref()],
        bump
    )]
    pub neuron: Account<'info, Neuron>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: Consensus program for validation
    pub consensus_program: UncheckedAccount<'info>,
    
    pub governor: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateNeuronStatus<'info> {
    #[account(mut)]
    pub neuron: Account<'info, Neuron>,
    
    /// CHECK: Authority (consensus or staking program)
    pub authority: Signer<'info>,
    
    /// CHECK: Consensus program
    pub consensus_program: UncheckedAccount<'info>,
    
    /// CHECK: Staking program
    pub staking_program: UncheckedAccount<'info>,
}

#[account]
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
    pub const LEN: usize = 2 + 32 + 1 + 1 + 32 + 8 + 8 + 2;
}

#[account]
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
    pub const LEN: usize = 2 + 2 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8;
}

#[error_code]
pub enum RegistryError {
    #[msg("Invalid max neurons (must be <= 256)")]
    InvalidMaxNeurons,
    #[msg("Invalid validator limit")]
    InvalidValidatorLimit,
    #[msg("Subnet is full")]
    SubnetFull,
    #[msg("Neuron already registered")]
    NeuronAlreadyRegistered,
    #[msg("Invalid subnet")]
    InvalidSubnet,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid neuron")]
    InvalidNeuron,
    #[msg("Neuron is still in immunity period")]
    NeuronImmune,
}


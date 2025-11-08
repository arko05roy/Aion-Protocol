use anchor_lang::prelude::*;

declare_id!("poiHive1111111111111111111111111111111");

#[program]
pub mod poi_hive {
    use super::*;

    /// Register a subnet in the global metagraph
    pub fn register_subnet(
        ctx: Context<RegisterSubnet>,
        subnet_id: u16,
    ) -> Result<()> {
        let metagraph = &mut ctx.accounts.metagraph;
        let subnet_registry = &ctx.accounts.subnet_registry;

        // Verify subnet exists in registry
        require!(
            subnet_registry.key() != Pubkey::default(),
            HiveError::InvalidSubnet
        );

        // Add to metagraph
        if !metagraph.subnets.contains(&subnet_id) {
            metagraph.subnets.push(subnet_id);
        }

        metagraph.total_subnets = metagraph.subnets.len() as u16;

        msg!("Subnet {} registered in metagraph", subnet_id);

        Ok(())
    }

    /// Update global governance parameters
    pub fn update_governance(
        ctx: Context<UpdateGovernance>,
        global_emission_rate: Option<u64>,
        cross_subnet_allocation_rate: Option<u64>,
    ) -> Result<()> {
        let governance = &mut ctx.accounts.governance;

        require!(
            ctx.accounts.authority.key() == governance.governor,
            HiveError::Unauthorized
        );

        if let Some(rate) = global_emission_rate {
            governance.global_emission_rate = rate;
        }

        if let Some(rate) = cross_subnet_allocation_rate {
            governance.cross_subnet_allocation_rate = rate;
        }

        msg!("Global governance parameters updated");

        Ok(())
    }

    /// Allocate cross-subnet emissions based on contribution
    pub fn allocate_cross_subnet_emissions(
        ctx: Context<AllocateCrossSubnet>,
        allocations: Vec<SubnetAllocation>,
    ) -> Result<()> {
        let governance = &ctx.accounts.governance;

        require!(
            ctx.accounts.authority.key() == governance.governor,
            HiveError::Unauthorized
        );

        // Calculate total allocation
        let total: u64 = allocations.iter().map(|a| a.allocation).sum();
        require!(
            total <= governance.global_emission_rate,
            HiveError::ExceedsGlobalEmission
        );

        // Distribute to subnets (would call emissions program)
        for allocation in allocations {
            msg!("Allocating {} to subnet {}", allocation.allocation, allocation.subnet_id);
        }

        Ok(())
    }

    /// Get metagraph state
    pub fn get_metagraph(_ctx: Context<GetMetagraph>) -> Result<MetagraphState> {
        // This would return current metagraph state
        // For now, just return placeholder
        Ok(MetagraphState {
            total_subnets: 0,
            active_neurons: 0,
            total_emissions: 0,
        })
    }
}

#[derive(Accounts)]
#[instruction(subnet_id: u16)]
pub struct RegisterSubnet<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Metagraph::LEN,
        seeds = [b"metagraph"],
        bump
    )]
    pub metagraph: Account<'info, Metagraph>,
    
    /// CHECK: Subnet registry account
    pub subnet_registry: UncheckedAccount<'info>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGovernance<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Governance::LEN,
        seeds = [b"governance"],
        bump
    )]
    pub governance: Account<'info, Governance>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AllocateCrossSubnet<'info> {
    #[account(
        seeds = [b"governance"],
        bump,
        has_one = authority @ HiveError::Unauthorized
    )]
    pub governance: Account<'info, Governance>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetMetagraph<'info> {
    #[account(
        seeds = [b"metagraph"],
        bump
    )]
    pub metagraph: Account<'info, Metagraph>,
}

#[account]
pub struct Metagraph {
    pub subnets: Vec<u16>,
    pub total_subnets: u16,
    pub created_at: i64,
}

impl Metagraph {
    pub const LEN: usize = 4 + (4 + 256 * 2) + 2 + 8;
}

#[account]
pub struct Governance {
    pub governor: Pubkey,
    pub global_emission_rate: u64,
    pub cross_subnet_allocation_rate: u64,
    pub created_at: i64,
}

impl Governance {
    pub const LEN: usize = 32 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SubnetAllocation {
    pub subnet_id: u16,
    pub allocation: u64,
}

pub struct MetagraphState {
    pub total_subnets: u16,
    pub active_neurons: u64,
    pub total_emissions: u64,
}

#[error_code]
pub enum HiveError {
    #[msg("Invalid subnet")]
    InvalidSubnet,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Exceeds global emission rate")]
    ExceedsGlobalEmission,
}


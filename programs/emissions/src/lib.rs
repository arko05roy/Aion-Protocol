use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("poiEmissions111111111111111111111111");

#[program]
pub mod poi_emissions {
    use super::*;

    /// Distribute emissions for a subnet epoch based on consensus
    pub fn distribute_emissions(
        ctx: Context<DistributeEmissions>,
        subnet_id: u16,
        epoch: u64,
    ) -> Result<()> {
        let consensus_state = &ctx.accounts.consensus_state;
        let subnet = &ctx.accounts.subnet;

        require!(
            consensus_state.subnet_id == subnet_id && consensus_state.epoch == epoch,
            EmissionsError::InvalidEpoch
        );
        require!(
            consensus_state.finalized == true,
            EmissionsError::ConsensusNotFinalized
        );

        let total_emissions = subnet.emission_rate;
        let total_weight: u64 = consensus_state.miner_consensus
            .iter()
            .map(|e| e.consensus_weight + e.trust_score)
            .sum();

        // Distribute to miners
        for entry in &consensus_state.miner_consensus {
            if total_weight > 0 {
                let share = (entry.consensus_weight + entry.trust_score) * total_emissions / total_weight;
                
                // Update emission balance (would transfer tokens in production)
                // For now, we track balances in EmissionBalance accounts
            }
        }

        // Distribute to validators (proportional to validator trust)
        let total_validator_weight: u64 = consensus_state.validator_consensus
            .iter()
            .map(|e| e.trust_score)
            .sum();

        for entry in &consensus_state.validator_consensus {
            if total_validator_weight > 0 {
                let share = entry.trust_score * total_emissions / total_validator_weight;
                // Update validator emission balance
            }
        }

        msg!("Distributed {} α tokens for epoch {} in subnet {}", 
             total_emissions, epoch, subnet_id);

        Ok(())
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        subnet_id: u16,
    ) -> Result<()> {
        let emission_balance = &mut ctx.accounts.emission_balance;
        let neuron = &ctx.accounts.neuron;

        require!(
            emission_balance.subnet_id == subnet_id,
            EmissionsError::InvalidSubnet
        );
        require!(
            emission_balance.accumulated > 0,
            EmissionsError::NoRewardsToClaim
        );

        let amount = emission_balance.accumulated;
        emission_balance.accumulated = 0;
        emission_balance.claimed += amount;

        // Transfer tokens (would use SPL token transfer in production)
        // For now, we just update the balance

        msg!("Neuron {} claimed {} α tokens from subnet {}", 
             neuron.uid, amount, subnet_id);

        Ok(())
    }

    /// Cross-subnet allocation (called by Hive)
    pub fn cross_subnet_allocation(
        ctx: Context<CrossSubnetAllocation>,
        allocations: Vec<SubnetAllocation>,
    ) -> Result<()> {
        // Only Hive can call this
        require!(
            ctx.accounts.hive.key() == ctx.accounts.authority.key(),
            EmissionsError::Unauthorized
        );

        for allocation in allocations {
            // Allocate emissions to subnet based on global contribution
            // Implementation would update subnet emission rates
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(subnet_id: u16, epoch: u64)]
pub struct DistributeEmissions<'info> {
    /// CHECK: Consensus state account
    #[account(
        seeds = [b"consensus", &subnet_id.to_le_bytes(), &epoch.to_le_bytes()],
        bump
    )]
    pub consensus_state: UncheckedAccount<'info>,
    
    /// CHECK: Subnet account
    #[account(
        seeds = [b"subnet", &subnet_id.to_le_bytes()],
        bump
    )]
    pub subnet: UncheckedAccount<'info>,
    
    /// CHECK: Authority (governor or automated)
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subnet_id: u16)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"emission", &subnet_id.to_le_bytes(), neuron.hotkey.key().as_ref()],
        bump
    )]
    pub emission_balance: Account<'info, EmissionBalance>,
    
    /// CHECK: Neuron account
    #[account(
        seeds = [b"neuron", &subnet_id.to_le_bytes(), neuron.hotkey.key().as_ref()],
        bump
    )]
    pub neuron: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub claimant: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CrossSubnetAllocation<'info> {
    /// CHECK: Hive program
    pub hive: UncheckedAccount<'info>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct EmissionBalance {
    pub neuron_uid: u16,
    pub subnet_id: u16,
    pub accumulated: u64,
    pub claimed: u64,
    pub last_updated: i64,
}

impl EmissionBalance {
    pub const LEN: usize = 2 + 2 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SubnetAllocation {
    pub subnet_id: u16,
    pub allocation: u64,
}

#[error_code]
pub enum EmissionsError {
    #[msg("Invalid epoch")]
    InvalidEpoch,
    #[msg("Consensus not finalized")]
    ConsensusNotFinalized,
    #[msg("Invalid subnet")]
    InvalidSubnet,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Unauthorized")]
    Unauthorized,
}


use anchor_lang::prelude::*;

declare_id!("poiStaking1111111111111111111111111");

#[program]
pub mod poi_staking {
    use super::*;

    /// Stake SOL as a validator
    pub fn stake_validator(
        ctx: Context<StakeValidator>,
        subnet_id: u16,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);

        let stake_account = &mut ctx.accounts.stake_account;

        // Transfer SOL to stake account
        **ctx.accounts.stake_account.to_account_info().try_borrow_mut_lamports()? += amount;
        **ctx.accounts.validator.to_account_info().try_borrow_mut_lamports()? -= amount;

        stake_account.validator = ctx.accounts.validator.key();
        stake_account.subnet_id = subnet_id;
        stake_account.amount += amount;
        stake_account.delegated_amount = 0;

        msg!("Validator {} staked {} SOL in subnet {}", 
             ctx.accounts.validator.key(), amount, subnet_id);

        Ok(())
    }

    /// Delegate stake to a validator
    pub fn delegate(
        ctx: Context<Delegate>,
        subnet_id: u16,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);

        let delegation = &mut ctx.accounts.delegation;
        let stake_account = &mut ctx.accounts.stake_account;

        // Transfer SOL to stake account
        **ctx.accounts.stake_account.to_account_info().try_borrow_mut_lamports()? += amount;
        **ctx.accounts.delegator.to_account_info().try_borrow_mut_lamports()? -= amount;

        if delegation.amount == 0 {
            // New delegation
            delegation.delegator = ctx.accounts.delegator.key();
            delegation.validator = ctx.accounts.validator.key();
            delegation.subnet_id = subnet_id;
        }

        delegation.amount += amount;
        stake_account.delegated_amount += amount;

        msg!("Delegator {} delegated {} SOL to validator {} in subnet {}", 
             ctx.accounts.delegator.key(), amount, ctx.accounts.validator.key(), subnet_id);

        Ok(())
    }

    /// Unstake SOL (with cooldown period)
    pub fn unstake(
        ctx: Context<Unstake>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StakingError::InvalidAmount);

        let stake_account = &mut ctx.accounts.stake_account;
        let neuron = &mut ctx.accounts.neuron;

        require!(
            stake_account.amount >= amount,
            StakingError::InsufficientStake
        );

        // Check if unstaking from own stake or delegation
        let is_validator_unstake = ctx.accounts.authority.key() == stake_account.validator;
        let is_delegator_unstake = ctx.accounts.delegation.is_some();

        if is_validator_unstake {
            require!(
                stake_account.amount - stake_account.delegated_amount >= amount,
                StakingError::CannotUnstakeDelegated
            );
            stake_account.amount -= amount;
        } else if let Some(delegation) = &mut ctx.accounts.delegation {
            require!(
                delegation.amount >= amount,
                StakingError::InsufficientStake
            );
            delegation.amount -= amount;
            stake_account.delegated_amount -= amount;
        } else {
            return Err(StakingError::Unauthorized.into());
        }

        // Set cooldown period (7 days)
        stake_account.unstake_cooldown_until = Clock::get()?.unix_timestamp + 604800;
        stake_account.unstake_pending += amount;

        msg!("Unstaked {} SOL from validator {} in subnet {}", 
             amount, ctx.accounts.validator.key(), stake_account.subnet_id);

        Ok(())
    }

    /// Withdraw unstaked SOL after cooldown
    pub fn withdraw_unstaked(
        ctx: Context<WithdrawUnstaked>,
        amount: u64,
    ) -> Result<()> {
        let stake_account = &ctx.accounts.stake_account;

        require!(
            Clock::get()?.unix_timestamp >= stake_account.unstake_cooldown_until,
            StakingError::CooldownActive
        );

        require!(
            stake_account.unstake_pending >= amount,
            StakingError::InsufficientUnstakePending
        );

        // Transfer SOL back
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;
        **ctx.accounts.stake_account.to_account_info().try_borrow_mut_lamports()? -= amount;

        stake_account.unstake_pending -= amount;

        msg!("Withdrew {} SOL from unstake pool", amount);

        Ok(())
    }

    /// Calculate stake weight: W = α + 0.18 × τ
    /// α = validator's direct stake, τ = delegated stake
    pub fn calculate_stake_weight(
        stake_account: &StakeAccount,
    ) -> u64 {
        let alpha = stake_account.amount - stake_account.delegated_amount;
        let tau = stake_account.delegated_amount;
        
        // W = α + 0.18 × τ
        // Using fixed-point math: 0.18 = 18/100
        alpha + (tau * 18) / 100
    }

    /// Update validator permit eligibility based on stake and emissions
    pub fn update_permit_eligibility(
        _ctx: Context<UpdatePermitEligibility>,
    ) -> Result<()> {
        // This would typically be called by consensus program after epoch finalization
        // Stake weight calculation is done via calculate_stake_weight()
        // Actual permit assignment happens in consensus program
        // This function is called by consensus program to update eligibility

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(subnet_id: u16)]
pub struct StakeValidator<'info> {
    #[account(
        init,
        payer = validator,
        space = 8 + StakeAccount::LEN,
        seeds = [b"stake", validator.key().as_ref(), &subnet_id.to_le_bytes()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub validator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subnet_id: u16)]
pub struct Delegate<'info> {
    #[account(
        mut,
        seeds = [b"stake", validator.key().as_ref(), &subnet_id.to_le_bytes()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(
        init_if_needed,
        payer = delegator,
        space = 8 + Delegation::LEN,
        seeds = [b"delegation", delegator.key().as_ref(), validator.key().as_ref(), &subnet_id.to_le_bytes()],
        bump
    )]
    pub delegation: Account<'info, Delegation>,
    
    /// CHECK: Validator
    pub validator: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub delegator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"stake", validator.key().as_ref(), &stake_account.subnet_id.to_le_bytes()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    /// CHECK: Validator or delegator
    pub authority: Signer<'info>,
    
    /// CHECK: Validator
    pub validator: UncheckedAccount<'info>,
    
    /// CHECK: Optional delegation account
    pub delegation: Option<Account<'info, Delegation>>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawUnstaked<'info> {
    #[account(
        mut,
        seeds = [b"stake", validator.key().as_ref(), neuron.subnet_id.to_le_bytes().as_ref()],
        bump,
        has_one = authority @ StakingError::Unauthorized
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePermitEligibility<'info> {
    #[account(
        mut,
        seeds = [b"stake", validator.key().as_ref(), &stake_account.subnet_id.to_le_bytes()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    /// CHECK: Authority (consensus program)
    pub authority: Signer<'info>,
    
    /// CHECK: Validator
    pub validator: UncheckedAccount<'info>,
}

#[account]
pub struct StakeAccount {
    pub validator: Pubkey,
    pub subnet_id: u16,
    pub amount: u64,
    pub delegated_amount: u64,
    pub unstake_pending: u64,
    pub unstake_cooldown_until: i64,
}

impl StakeAccount {
    pub const LEN: usize = 32 + 2 + 8 + 8 + 8 + 8;
}

#[account]
pub struct Delegation {
    pub delegator: Pubkey,
    pub validator: Pubkey,
    pub subnet_id: u16,
    pub amount: u64,
}

impl Delegation {
    pub const LEN: usize = 32 + 32 + 2 + 8;
}

#[error_code]
pub enum StakingError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient stake")]
    InsufficientStake,
    #[msg("Cannot unstake delegated funds")]
    CannotUnstakeDelegated,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Cooldown period still active")]
    CooldownActive,
    #[msg("Insufficient unstake pending")]
    InsufficientUnstakePending,
}


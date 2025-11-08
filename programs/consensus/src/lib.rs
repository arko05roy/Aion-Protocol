use anchor_lang::prelude::*;

declare_id!("poiConsensus111111111111111111111111");

#[program]
pub mod poi_consensus {
    use super::*;

    /// Submit weights for miners in a subnet epoch
    pub fn submit_weights(
        ctx: Context<SubmitWeights>,
        subnet_id: u16,
        epoch: u64,
        validator_uid: u16,
        weights: Vec<WeightEntry>,
    ) -> Result<()> {
        let consensus_state = &mut ctx.accounts.consensus_state;

        require!(
            consensus_state.subnet_id == subnet_id,
            ConsensusError::InvalidSubnet
        );
        require!(
            consensus_state.epoch == epoch,
            ConsensusError::InvalidEpoch
        );
        require!(
            consensus_state.finalized == false,
            ConsensusError::EpochFinalized
        );

        // Store weight submission
        let submission = WeightSubmission {
            validator_uid,
            subnet_id,
            epoch,
            weights: weights.clone(),
            timestamp: Clock::get()?.unix_timestamp,
        };

        consensus_state.submissions.push(submission);

        msg!("Validator {} submitted weights for epoch {} in subnet {}", 
             validator_uid, epoch, subnet_id);

        Ok(())
    }

    /// Finalize consensus by computing weighted median
    pub fn finalize_consensus(
        ctx: Context<FinalizeConsensus>,
        subnet_id: u16,
        epoch: u64,
    ) -> Result<()> {
        let consensus_state = &mut ctx.accounts.consensus_state;

        require!(
            consensus_state.subnet_id == subnet_id && consensus_state.epoch == epoch,
            ConsensusError::InvalidEpoch
        );
        require!(
            consensus_state.finalized == false,
            ConsensusError::EpochFinalized
        );

        // Compute weighted median consensus for each miner
        let miner_consensus = Self::compute_weighted_median(
            &consensus_state.submissions,
            &ctx.accounts.stake_accounts,
        )?;

        // Calculate trust scores
        let trust_scores = Self::calculate_trust_scores(
            &consensus_state.submissions,
            &miner_consensus,
        )?;

        // Update consensus state
        consensus_state.miner_consensus = miner_consensus.clone();
        consensus_state.validator_consensus = trust_scores.validator_trust;
        consensus_state.finalized = true;
        consensus_state.finalized_at = Clock::get()?.unix_timestamp;

        msg!("Consensus finalized for epoch {} in subnet {}", epoch, subnet_id);

        Ok(())
    }

    /// Compute weighted median consensus for miners
    fn compute_weighted_median(
        submissions: &[WeightSubmission],
        stake_accounts: &[AccountInfo],
    ) -> Result<Vec<ConsensusEntry>> {
        use std::collections::HashMap;

        // Aggregate weights by miner UID
        let mut miner_weights: HashMap<u16, Vec<(u64, u64)>> = HashMap::new(); // (weight, stake)

        for submission in submissions {
            // Get validator stake weight
            let stake_weight = Self::get_validator_stake_weight(
                submission.validator_uid,
                stake_accounts,
            )?;

            for entry in &submission.weights {
                miner_weights
                    .entry(entry.miner_uid)
                    .or_insert_with(Vec::new)
                    .push((entry.weight, stake_weight));
            }
        }

        // Compute weighted median for each miner
        let mut consensus_entries = Vec::new();

        for (miner_uid, weights) in miner_weights {
            // Sort by weight value
            let mut sorted_weights = weights.clone();
            sorted_weights.sort_by_key(|(w, _)| *w);

            // Calculate cumulative stake
            let total_stake: u64 = sorted_weights.iter().map(|(_, s)| s).sum();
            let median_stake = total_stake / 2;

            // Find weighted median
            let mut cumulative_stake = 0u64;
            let mut median_weight = 0u64;

            for (weight, stake) in &sorted_weights {
                cumulative_stake += stake;
                if cumulative_stake >= median_stake {
                    median_weight = *weight;
                    break;
                }
            }

            // Apply clipping (remove outliers >2σ from median)
            let clipped_weight = Self::clip_outliers(median_weight, &sorted_weights);

            consensus_entries.push(ConsensusEntry {
                uid: miner_uid,
                consensus_weight: clipped_weight,
                trust_score: 0, // Calculated separately
                emission_share: 0, // Calculated in emissions program
            });
        }

        Ok(consensus_entries)
    }

    /// Get validator stake weight (simplified - would need proper account deserialization)
    fn get_validator_stake_weight(
        _validator_uid: u16,
        _stake_accounts: &[AccountInfo],
    ) -> Result<u64> {
        // TODO: Deserialize stake account and calculate weight
        // For now, return placeholder
        Ok(1000) // Placeholder
    }

    /// Clip outliers using 2-sigma rule
    fn clip_outliers(median: u64, weights: &[(u64, u64)]) -> u64 {
        if weights.is_empty() {
            return median;
        }

        // Calculate standard deviation
        let mean: f64 = weights.iter()
            .map(|(w, _)| *w as f64)
            .sum::<f64>() / weights.len() as f64;

        let variance: f64 = weights.iter()
            .map(|(w, _)| {
                let diff = *w as f64 - mean;
                diff * diff
            })
            .sum::<f64>() / weights.len() as f64;

        let std_dev = variance.sqrt();
        let threshold = 2.0 * std_dev;

        // Clip values outside 2σ
        let clipped: Vec<u64> = weights.iter()
            .map(|(w, _)| *w)
            .filter(|w| {
                let diff = (*w as f64 - mean).abs();
                diff <= threshold
            })
            .collect();

        if clipped.is_empty() {
            median
        } else {
            clipped.iter().sum::<u64>() / clipped.len() as u64
        }
    }

    /// Calculate trust scores for miners and validators
    fn calculate_trust_scores(
        submissions: &[WeightSubmission],
        miner_consensus: &[ConsensusEntry],
    ) -> Result<TrustScores> {
        use std::collections::HashMap;

        // Build consensus map
        let consensus_map: HashMap<u16, u64> = miner_consensus
            .iter()
            .map(|e| (e.uid, e.consensus_weight))
            .collect();

        // Calculate miner trust (alignment with consensus)
        let mut miner_trust = Vec::new();
        for entry in miner_consensus {
            let consensus = entry.consensus_weight;
            let mut alignment_sum = 0u64;
            let mut count = 0u64;

            for submission in submissions {
                if let Some(weight_entry) = submission.weights.iter()
                    .find(|w| w.miner_uid == entry.uid) {
                    let diff = if weight_entry.weight > consensus {
                        weight_entry.weight - consensus
                    } else {
                        consensus - weight_entry.weight
                    };
                    // Trust = inverse of deviation (normalized to 0-10000)
                    let alignment = 10000u64.saturating_sub(diff.min(10000));
                    alignment_sum += alignment;
                    count += 1;
                }
            }

            let trust = if count > 0 {
                alignment_sum / count
            } else {
                0
            };

            miner_trust.push((entry.uid, trust));
        }

        // Calculate validator trust (alignment with final consensus)
        let mut validator_trust = Vec::new();
        for submission in submissions {
            let mut alignment_sum = 0u64;
            let mut count = 0u64;

            for weight_entry in &submission.weights {
                if let Some(&consensus_weight) = consensus_map.get(&weight_entry.miner_uid) {
                    let diff = if weight_entry.weight > consensus_weight {
                        weight_entry.weight - consensus_weight
                    } else {
                        consensus_weight - weight_entry.weight
                    };
                    let alignment = 10000u64.saturating_sub(diff.min(10000));
                    alignment_sum += alignment;
                    count += 1;
                }
            }

            let trust = if count > 0 {
                alignment_sum / count
            } else {
                0
            };

            validator_trust.push(ConsensusEntry {
                uid: submission.validator_uid,
                consensus_weight: 0,
                trust_score: trust,
                emission_share: 0,
            });
        }

        Ok(TrustScores {
            miner_trust,
            validator_trust,
        })
    }
}

#[derive(Accounts)]
#[instruction(subnet_id: u16, epoch: u64)]
pub struct SubmitWeights<'info> {
    #[account(
        init_if_needed,
        payer = validator_signer,
        space = 8 + ConsensusState::LEN,
        seeds = [b"consensus", &subnet_id.to_le_bytes(), &epoch.to_le_bytes()],
        bump
    )]
    pub consensus_state: Account<'info, ConsensusState>,
    
    #[account(mut)]
    pub validator_signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subnet_id: u16, epoch: u64)]
pub struct FinalizeConsensus<'info> {
    #[account(
        mut,
        seeds = [b"consensus", &subnet_id.to_le_bytes(), &epoch.to_le_bytes()],
        bump
    )]
    pub consensus_state: Account<'info, ConsensusState>,
    
    /// CHECK: Authority (governor or automated finalizer)
    pub authority: Signer<'info>,
    
    /// CHECK: Stake accounts for validators (variable length)
    /// Multiple stake accounts passed for stake weight calculation
    pub stake_accounts: Vec<AccountInfo<'info>>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ConsensusState {
    pub subnet_id: u16,
    pub epoch: u64,
    pub submissions: Vec<WeightSubmission>,
    pub miner_consensus: Vec<ConsensusEntry>,
    pub validator_consensus: Vec<ConsensusEntry>,
    pub finalized: bool,
    pub finalized_at: i64,
}

impl ConsensusState {
    pub const LEN: usize = 2 + 8 + 4 + (4 + 100 * WeightSubmission::LEN) + 4 + (4 + 100 * ConsensusEntry::LEN) + 4 + (4 + 100 * ConsensusEntry::LEN) + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WeightSubmission {
    pub validator_uid: u16,
    pub subnet_id: u16,
    pub epoch: u64,
    pub weights: Vec<WeightEntry>,
    pub timestamp: i64,
}

impl WeightSubmission {
    pub const LEN: usize = 2 + 2 + 8 + 4 + (4 + 100 * WeightEntry::LEN) + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WeightEntry {
    pub miner_uid: u16,
    pub weight: u64, // Normalized 0-10000
}

impl WeightEntry {
    pub const LEN: usize = 2 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConsensusEntry {
    pub uid: u16,
    pub consensus_weight: u64,
    pub trust_score: u64,
    pub emission_share: u64,
}

impl ConsensusEntry {
    pub const LEN: usize = 2 + 8 + 8 + 8;
}

struct TrustScores {
    miner_trust: Vec<(u16, u64)>,
    validator_trust: Vec<ConsensusEntry>,
}

#[error_code]
pub enum ConsensusError {
    #[msg("Invalid subnet")]
    InvalidSubnet,
    #[msg("Invalid epoch")]
    InvalidEpoch,
    #[msg("Epoch already finalized")]
    EpochFinalized,
    #[msg("Not a validator")]
    NotValidator,
    #[msg("Insufficient submissions")]
    InsufficientSubmissions,
}


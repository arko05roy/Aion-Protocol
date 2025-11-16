// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StakeCalculation
 * @notice Library for calculating validator stake weights
 * @dev Implements the formula: W = α + 0.18τ where α is direct stake and τ is delegated stake
 */
library StakeCalculation {
    uint256 private constant DELEGATION_MULTIPLIER = 18; // 0.18 * 100
    uint256 private constant MULTIPLIER_DIVISOR = 100;

    /**
     * @notice Calculate validator stake weight
     * @param directStake Direct validator stake (α)
     * @param delegatedStake Total delegated stake to validator (τ)
     * @return weight Calculated stake weight
     */
    function calculateWeight(
        uint256 directStake,
        uint256 delegatedStake
    ) internal pure returns (uint256 weight) {
        // W = α + 0.18τ
        uint256 delegationComponent = (delegatedStake * DELEGATION_MULTIPLIER) / MULTIPLIER_DIVISOR;
        weight = directStake + delegationComponent;
    }

    /**
     * @notice Calculate delegation rewards share
     * @param totalRewards Total rewards to distribute
     * @param delegatedAmount Amount delegated by a specific delegator
     * @param totalDelegated Total amount delegated to the validator
     * @return share Delegator's share of rewards
     */
    function calculateDelegatorShare(
        uint256 totalRewards,
        uint256 delegatedAmount,
        uint256 totalDelegated
    ) internal pure returns (uint256 share) {
        if (totalDelegated == 0) return 0;
        share = (totalRewards * delegatedAmount) / totalDelegated;
    }
}


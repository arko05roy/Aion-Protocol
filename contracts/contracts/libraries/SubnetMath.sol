// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SubnetMath
 * @notice Library for subnet performance and trust calculations
 * @dev Implements trust score and performance metrics calculations
 */
library SubnetMath {
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MAX_TRUST = 1e18; // 100% trust
    uint256 private constant MIN_TRUST = 0;

    /**
     * @notice Calculate trust score based on alignment with consensus
     * @param minerWeight Weight assigned by validator to miner
     * @param consensusWeight Consensus weight for miner
     * @param tolerance Acceptable deviation tolerance (in basis points, e.g., 1000 = 10%)
     * @return trust Trust score (0 to 1e18)
     */
    function calculateTrust(
        uint256 minerWeight,
        uint256 consensusWeight,
        uint256 tolerance
    ) internal pure returns (uint256 trust) {
        if (consensusWeight == 0) return MIN_TRUST;

        uint256 deviation;
        if (minerWeight > consensusWeight) {
            deviation = ((minerWeight - consensusWeight) * 10000) / consensusWeight;
        } else {
            deviation = ((consensusWeight - minerWeight) * 10000) / consensusWeight;
        }

        if (deviation <= tolerance) {
            // Within tolerance - full trust
            trust = MAX_TRUST;
        } else if (deviation >= 10000) {
            // Complete deviation - no trust
            trust = MIN_TRUST;
        } else {
            // Proportional trust based on deviation
            trust = MAX_TRUST - ((deviation - tolerance) * MAX_TRUST) / (10000 - tolerance);
        }
    }

    /**
     * @notice Calculate validator trust based on historical alignment
     * @param alignmentScore Sum of alignment scores
     * @param totalSubmissions Total number of weight submissions
     * @return validatorTrust Validator trust score
     */
    function calculateValidatorTrust(
        uint256 alignmentScore,
        uint256 totalSubmissions
    ) internal pure returns (uint256 validatorTrust) {
        if (totalSubmissions == 0) return MAX_TRUST / 2; // Default to 50% for new validators
        
        validatorTrust = (alignmentScore * MAX_TRUST) / totalSubmissions;
        if (validatorTrust > MAX_TRUST) validatorTrust = MAX_TRUST;
    }

    /**
     * @notice Calculate incentive (normalized emission share)
     * @param rank Neuron's performance rank
     * @param totalRank Sum of all ranks in subnet
     * @return incentive Normalized incentive value
     */
    function calculateIncentive(
        uint256 rank,
        uint256 totalRank
    ) internal pure returns (uint256 incentive) {
        if (totalRank == 0) return 0;
        incentive = (rank * PRECISION) / totalRank;
    }

    /**
     * @notice Apply exponential moving average to update scores
     * @param oldValue Previous value
     * @param newValue New observation
     * @param alpha EMA smoothing factor (0 to PRECISION)
     * @return updated Updated EMA value
     */
    function exponentialMovingAverage(
        uint256 oldValue,
        uint256 newValue,
        uint256 alpha
    ) internal pure returns (uint256 updated) {
        require(alpha <= PRECISION, "Alpha out of range");
        
        // EMA = α × new + (1 - α) × old
        uint256 alphaPart = (alpha * newValue) / PRECISION;
        uint256 oneMinusAlpha = PRECISION - alpha;
        uint256 oldPart = (oneMinusAlpha * oldValue) / PRECISION;
        
        updated = alphaPart + oldPart;
    }

    /**
     * @notice Calculate rank after applying weight clipping
     * @param rawWeight Raw weight from validator
     * @param minClip Minimum clip threshold
     * @param maxClip Maximum clip threshold
     * @return clippedWeight Clipped weight value
     */
    function clipWeight(
        uint256 rawWeight,
        uint256 minClip,
        uint256 maxClip
    ) internal pure returns (uint256 clippedWeight) {
        if (rawWeight < minClip) {
            clippedWeight = minClip;
        } else if (rawWeight > maxClip) {
            clippedWeight = maxClip;
        } else {
            clippedWeight = rawWeight;
        }
    }

    /**
     * @notice Calculate distance between two weight vectors
     * @param weights1 First weight vector
     * @param weights2 Second weight vector
     * @return distance Euclidean distance
     */
    function calculateDistance(
        uint256[] memory weights1,
        uint256[] memory weights2
    ) internal pure returns (uint256 distance) {
        require(weights1.length == weights2.length, "Length mismatch");
        
        uint256 sumSquares = 0;
        for (uint256 i = 0; i < weights1.length; i++) {
            uint256 diff = weights1[i] > weights2[i] 
                ? weights1[i] - weights2[i] 
                : weights2[i] - weights1[i];
            sumSquares += diff * diff;
        }
        
        distance = sqrt(sumSquares);
    }

    /**
     * @notice Integer square root using Babylonian method
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}


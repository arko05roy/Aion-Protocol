// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/WeightedMedian.sol";
import "../libraries/SubnetMath.sol";

/**
 * @title Consensus
 * @notice Manages weight submission, weighted median consensus, and trust calculation
 * @dev Core consensus mechanism for Proof-of-Intelligence
 */
contract Consensus is Ownable, ReentrancyGuard {
    using WeightedMedian for uint256[];
    using SubnetMath for uint256;

    // Structs
    struct WeightSubmission {
        uint16[] minerUids;
        uint256[] weights;
        uint256 submittedAt;
        bool processed;
    }

    struct ConsensusState {
        uint256[] consensusWeights;
        uint256 lastCalculated;
        uint256 epoch;
        bool finalized;
    }

    struct TrustScore {
        uint256 minerTrust;
        uint256 validatorTrust;
        uint256 alignmentScore;
        uint256 totalSubmissions;
        uint256 lastUpdated;
    }

    // Constants
    uint256 public constant WEIGHT_SUM_TARGET = 65535; // u16 max for normalization
    uint256 public constant EPOCH_LENGTH = 360; // ~18 minutes (3s per block)
    uint256 public constant TRUST_TOLERANCE = 1000; // 10% deviation tolerance
    uint256 public constant MIN_VALIDATOR_WEIGHT = 1 ether; // Minimum stake to submit weights

    // State variables
    address public registryContract;
    address public stakingContract;
    
    mapping(uint16 => mapping(uint256 => mapping(address => WeightSubmission))) public submissions; // subnetId => epoch => validator => submission
    mapping(uint16 => mapping(uint256 => ConsensusState)) public consensusState; // subnetId => epoch => state
    mapping(uint16 => mapping(address => TrustScore)) public validatorTrust; // subnetId => validator => trust
    mapping(uint16 => mapping(uint16 => TrustScore)) public minerTrust; // subnetId => minerUid => trust
    mapping(uint16 => uint256) public currentEpoch;
    mapping(uint16 => address[]) public epochValidators; // subnetId => validators for current epoch

    // Events
    event WeightsSubmitted(uint16 indexed subnetId, address indexed validator, uint256 epoch, uint16[] minerUids, uint256[] weights);
    event ConsensusCalculated(uint16 indexed subnetId, uint256 epoch, uint256[] consensusWeights);
    event TrustUpdated(uint16 indexed subnetId, uint16 indexed minerUid, uint256 trust);
    event ValidatorTrustUpdated(uint16 indexed subnetId, address indexed validator, uint256 trust);
    event EpochAdvanced(uint16 indexed subnetId, uint256 newEpoch);

    // Modifiers
    modifier onlyRegistry() {
        require(msg.sender == registryContract, "Only registry");
        _;
    }

    modifier validatorOnly(uint16 subnetId) {
        require(_isValidator(subnetId, msg.sender), "Not a validator");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set contract addresses
     * @param _registryContract Registry contract address
     * @param _stakingContract Staking contract address
     */
    function setContracts(address _registryContract, address _stakingContract) external onlyOwner {
        require(_registryContract != address(0) && _stakingContract != address(0), "Invalid addresses");
        registryContract = _registryContract;
        stakingContract = _stakingContract;
    }

    /**
     * @notice Submit weights for miners
     * @param subnetId Subnet ID
     * @param minerUids Array of miner UIDs
     * @param weights Array of weights for each miner
     */
    function submitWeights(
        uint16 subnetId,
        uint16[] calldata minerUids,
        uint256[] calldata weights
    ) external nonReentrant validatorOnly(subnetId) {
        require(minerUids.length == weights.length, "Length mismatch");
        require(minerUids.length > 0, "Empty submission");
        
        uint256 epoch = _getCurrentEpoch(subnetId);
        
        // Check if already submitted for this epoch
        require(!submissions[subnetId][epoch][msg.sender].processed, "Already submitted");

        // Normalize weights
        uint256[] memory normalized = WeightedMedian.normalizeWeights(weights, WEIGHT_SUM_TARGET);

        // Store submission
        submissions[subnetId][epoch][msg.sender] = WeightSubmission({
            minerUids: minerUids,
            weights: normalized,
            submittedAt: block.timestamp,
            processed: false
        });

        // Add to epoch validators
        epochValidators[subnetId].push(msg.sender);

        emit WeightsSubmitted(subnetId, msg.sender, epoch, minerUids, normalized);
    }

    /**
     * @notice Calculate consensus weights for current epoch
     * @param subnetId Subnet ID
     * @return consensus Array of consensus weights
     */
    function calculateConsensus(
        uint16 subnetId
    ) external nonReentrant returns (uint256[] memory consensus) {
        uint256 epoch = currentEpoch[subnetId];
        ConsensusState storage state = consensusState[subnetId][epoch];
        
        require(!state.finalized, "Epoch already finalized");
        require(epochValidators[subnetId].length > 0, "No submissions");

        // Collect all submissions
        address[] memory validators = epochValidators[subnetId];
        uint256 maxUid = 0;

        // Find max UID to determine array size
        for (uint256 i = 0; i < validators.length; i++) {
            WeightSubmission storage submission = submissions[subnetId][epoch][validators[i]];
            for (uint256 j = 0; j < submission.minerUids.length; j++) {
                if (submission.minerUids[j] > maxUid) {
                    maxUid = submission.minerUids[j];
                }
            }
        }

        // Initialize consensus array
        consensus = new uint256[](maxUid + 1);

        // Calculate weighted median for each miner
        for (uint16 uid = 0; uid <= maxUid; uid++) {
            uint256[] memory values = new uint256[](validators.length);
            uint256[] memory stakes = new uint256[](validators.length);
            uint256 count = 0;

            // Collect weights for this miner from all validators
            for (uint256 i = 0; i < validators.length; i++) {
                WeightSubmission storage submission = submissions[subnetId][epoch][validators[i]];
                
                // Find weight for this UID
                for (uint256 j = 0; j < submission.minerUids.length; j++) {
                    if (submission.minerUids[j] == uid) {
                        values[count] = submission.weights[j];
                        stakes[count] = _getValidatorStake(subnetId, validators[i]);
                        count++;
                        break;
                    }
                }
            }

            // Calculate weighted median if miner received weights
            if (count > 0) {
                uint256[] memory actualValues = new uint256[](count);
                uint256[] memory actualStakes = new uint256[](count);
                
                for (uint256 k = 0; k < count; k++) {
                    actualValues[k] = values[k];
                    actualStakes[k] = stakes[k];
                }

                consensus[uid] = WeightedMedian.calculate(actualValues, actualStakes);
            }
        }

        // Store consensus state
        state.consensusWeights = consensus;
        state.lastCalculated = block.timestamp;
        state.epoch = epoch;
        state.finalized = true;

        emit ConsensusCalculated(subnetId, epoch, consensus);
    }

    /**
     * @notice Update trust scores based on consensus alignment
     * @param subnetId Subnet ID
     */
    function updateTrustScores(uint16 subnetId) external nonReentrant {
        uint256 epoch = currentEpoch[subnetId];
        ConsensusState storage state = consensusState[subnetId][epoch];
        
        require(state.finalized, "Consensus not finalized");

        address[] memory validators = epochValidators[subnetId];
        uint256[] memory consensus = state.consensusWeights;

        // Update trust for each validator based on alignment
        for (uint256 i = 0; i < validators.length; i++) {
            address validator = validators[i];
            WeightSubmission storage submission = submissions[subnetId][epoch][validator];
            
            uint256 alignmentScore = 0;
            uint256 comparisons = 0;

            // Calculate alignment with consensus
            for (uint256 j = 0; j < submission.minerUids.length; j++) {
                uint16 uid = submission.minerUids[j];
                if (uid < consensus.length) {
                    uint256 trust = SubnetMath.calculateTrust(
                        submission.weights[j],
                        consensus[uid],
                        TRUST_TOLERANCE
                    );
                    alignmentScore += trust;
                    comparisons++;

                    // Update miner trust
                    TrustScore storage mScore = minerTrust[subnetId][uid];
                    mScore.minerTrust = SubnetMath.exponentialMovingAverage(
                        mScore.minerTrust,
                        trust,
                        2e17 // Alpha = 0.2
                    );
                    mScore.lastUpdated = block.timestamp;

                    emit TrustUpdated(subnetId, uid, mScore.minerTrust);
                }
            }

            // Update validator trust
            if (comparisons > 0) {
                TrustScore storage vScore = validatorTrust[subnetId][validator];
                vScore.alignmentScore += alignmentScore;
                vScore.totalSubmissions++;
                vScore.validatorTrust = SubnetMath.calculateValidatorTrust(
                    vScore.alignmentScore,
                    vScore.totalSubmissions
                );
                vScore.lastUpdated = block.timestamp;

                emit ValidatorTrustUpdated(subnetId, validator, vScore.validatorTrust);
            }

            // Mark submission as processed
            submission.processed = true;
        }
    }

    /**
     * @notice Advance to next epoch
     * @param subnetId Subnet ID
     */
    function advanceEpoch(uint16 subnetId) external {
        require(
            block.number >= _getEpochStartBlock(subnetId) + EPOCH_LENGTH,
            "Epoch not finished"
        );

        currentEpoch[subnetId]++;
        delete epochValidators[subnetId];

        emit EpochAdvanced(subnetId, currentEpoch[subnetId]);
    }

    /**
     * @notice Get consensus weights for a subnet
     * @param subnetId Subnet ID
     * @return weights Array of consensus weights
     */
    function getConsensusWeights(uint16 subnetId) external view returns (uint256[] memory weights) {
        uint256 epoch = currentEpoch[subnetId];
        weights = consensusState[subnetId][epoch].consensusWeights;
    }

    /**
     * @notice Get validator trust score
     * @param subnetId Subnet ID
     * @param validator Validator address
     * @return TrustScore struct
     */
    function getValidatorTrust(
        uint16 subnetId,
        address validator
    ) external view returns (TrustScore memory) {
        return validatorTrust[subnetId][validator];
    }

    /**
     * @notice Get miner trust score
     * @param subnetId Subnet ID
     * @param minerUid Miner UID
     * @return TrustScore struct
     */
    function getMinerTrust(
        uint16 subnetId,
        uint16 minerUid
    ) external view returns (TrustScore memory) {
        return minerTrust[subnetId][minerUid];
    }

    /**
     * @notice Check if address is a validator
     */
    function _isValidator(uint16 subnetId, address validator) internal view returns (bool) {
        return _getValidatorStake(subnetId, validator) >= MIN_VALIDATOR_WEIGHT;
    }

    /**
     * @notice Get validator stake from Staking contract
     */
    function _getValidatorStake(uint16 subnetId, address validator) internal view returns (uint256) {
        if (stakingContract == address(0)) {
            return 0;
        }
        
        // Call Staking contract to get stake weight
        (bool success, bytes memory data) = stakingContract.staticcall(
            abi.encodeWithSignature("calculateStakeWeight(uint16,address)", subnetId, validator)
        );
        
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        
        return 0;
    }

    /**
     * @notice Get current epoch number
     */
    function _getCurrentEpoch(uint16 subnetId) internal view returns (uint256) {
        return currentEpoch[subnetId];
    }

    /**
     * @notice Get epoch start block
     */
    function _getEpochStartBlock(uint16 subnetId) internal view returns (uint256) {
        return currentEpoch[subnetId] * EPOCH_LENGTH;
    }
}


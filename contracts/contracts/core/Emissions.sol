// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../tokens/AionToken.sol";
import "../libraries/SubnetMath.sol";

/**
 * @title Emissions
 * @notice Manages reward distribution, token minting, and emission tracking
 * @dev Distributes rewards: 41% miners, 18% validators, 41% delegators
 */
contract Emissions is Ownable, ReentrancyGuard {
    using SubnetMath for uint256;

    // Structs
    struct EmissionSchedule {
        uint256 emissionRate;
        uint256 totalEmitted;
        uint256 lastDistribution;
        uint256 epoch;
    }

    struct PendingRewards {
        uint256 minerRewards;
        uint256 validatorRewards;
        uint256 delegatorRewards;
        uint256 lastClaimed;
    }

    // Constants
    uint256 public constant MINER_SHARE = 41; // 41%
    uint256 public constant VALIDATOR_SHARE = 18; // 18%
    uint256 public constant DELEGATOR_SHARE = 41; // 41%
    uint256 public constant SHARE_DENOMINATOR = 100;
    uint256 public constant EPOCH_DURATION = 360; // blocks

    // State variables
    AionToken public aionToken;
    address public registryContract;
    address public consensusContract;
    address public stakingContract;

    mapping(uint16 => EmissionSchedule) public emissionSchedules; // subnetId => schedule
    mapping(uint16 => mapping(address => PendingRewards)) public pendingRewards; // subnetId => user => rewards
    mapping(uint16 => uint256) public totalSubnetEmissions;

    // Events
    event EmissionsDistributed(uint16 indexed subnetId, uint256 epoch, uint256 minerRewards, uint256 validatorRewards, uint256 delegatorRewards);
    event RewardsClaimed(uint16 indexed subnetId, address indexed user, uint256 amount);
    event EmissionRateUpdated(uint16 indexed subnetId, uint256 newRate);

    // Modifiers
    modifier onlyRegistry() {
        require(msg.sender == registryContract, "Only registry");
        _;
    }

    constructor(address _aionToken) Ownable(msg.sender) {
        require(_aionToken != address(0), "Invalid token address");
        aionToken = AionToken(_aionToken);
    }

    /**
     * @notice Set contract addresses
     * @param _registryContract Registry contract
     * @param _consensusContract Consensus contract
     * @param _stakingContract Staking contract
     */
    function setContracts(
        address _registryContract,
        address _consensusContract,
        address _stakingContract
    ) external onlyOwner {
        require(
            _registryContract != address(0) &&
            _consensusContract != address(0) &&
            _stakingContract != address(0),
            "Invalid addresses"
        );
        registryContract = _registryContract;
        consensusContract = _consensusContract;
        stakingContract = _stakingContract;
    }

    /**
     * @notice Distribute emissions for a subnet
     * @param subnetId Subnet ID
     * @return minerRewards Total miner rewards
     * @return validatorRewards Total validator rewards
     */
    function distributeEmissions(
        uint16 subnetId
    ) external nonReentrant returns (uint256 minerRewards, uint256 validatorRewards) {
        EmissionSchedule storage schedule = emissionSchedules[subnetId];
        
        require(
            block.number >= schedule.lastDistribution + EPOCH_DURATION,
            "Epoch not ready"
        );

        // Calculate total emission for this epoch
        uint256 totalEmission = schedule.emissionRate;
        
        // Split rewards
        minerRewards = (totalEmission * MINER_SHARE) / SHARE_DENOMINATOR;
        validatorRewards = (totalEmission * VALIDATOR_SHARE) / SHARE_DENOMINATOR;
        uint256 delegatorRewards = (totalEmission * DELEGATOR_SHARE) / SHARE_DENOMINATOR;

        // Mint tokens
        aionToken.mint(address(this), totalEmission);

        // Distribute to miners based on consensus weights
        _distributeMinerRewards(subnetId, minerRewards);

        // Distribute to validators based on trust scores
        _distributeValidatorRewards(subnetId, validatorRewards);

        // Distribute to delegators proportionally
        _distributeDelegatorRewards(subnetId, delegatorRewards);

        // Update emission schedule
        schedule.totalEmitted += totalEmission;
        schedule.lastDistribution = block.number;
        schedule.epoch++;
        totalSubnetEmissions[subnetId] += totalEmission;

        emit EmissionsDistributed(subnetId, schedule.epoch, minerRewards, validatorRewards, delegatorRewards);
    }

    /**
     * @notice Claim pending rewards
     * @param subnetId Subnet ID
     */
    function claimRewards(uint16 subnetId) external nonReentrant {
        PendingRewards storage rewards = pendingRewards[subnetId][msg.sender];
        
        uint256 totalRewards = rewards.minerRewards + rewards.validatorRewards + rewards.delegatorRewards;
        require(totalRewards > 0, "No rewards to claim");

        // Reset pending rewards
        rewards.minerRewards = 0;
        rewards.validatorRewards = 0;
        rewards.delegatorRewards = 0;
        rewards.lastClaimed = block.timestamp;

        // Transfer tokens
        require(aionToken.transfer(msg.sender, totalRewards), "Transfer failed");

        emit RewardsClaimed(subnetId, msg.sender, totalRewards);
    }

    /**
     * @notice Set emission rate for a subnet
     * @param subnetId Subnet ID
     * @param rate New emission rate
     */
    function setEmissionRate(uint16 subnetId, uint256 rate) external onlyRegistry {
        emissionSchedules[subnetId].emissionRate = rate;
        emit EmissionRateUpdated(subnetId, rate);
    }

    /**
     * @notice Swap AION tokens for USDC
     * @param tokenAmount Amount of tokens to swap
     * @return usdcOut Amount of USDC received
     */
    function swapForUSDC(uint256 tokenAmount) external nonReentrant returns (uint256 usdcOut) {
        require(tokenAmount > 0, "Invalid amount");
        
        // Transfer tokens from user
        require(aionToken.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");
        
        // Swap via AionToken contract
        usdcOut = aionToken.swapToUSDC(tokenAmount);
        
        // In production, transfer USDC to user
        return usdcOut;
    }

    /**
     * @notice Get pending rewards for a user
     * @param subnetId Subnet ID
     * @param user User address
     * @return PendingRewards struct
     */
    function getPendingRewards(
        uint16 subnetId,
        address user
    ) external view returns (PendingRewards memory) {
        return pendingRewards[subnetId][user];
    }

    /**
     * @notice Get emission schedule for a subnet
     * @param subnetId Subnet ID
     * @return EmissionSchedule struct
     */
    function getEmissionSchedule(uint16 subnetId) external view returns (EmissionSchedule memory) {
        return emissionSchedules[subnetId];
    }

    /**
     * @notice Distribute rewards to miners based on consensus weights
     */
    function _distributeMinerRewards(uint16 subnetId, uint256 totalRewards) internal {
        // In production, fetch consensus weights from Consensus contract
        // For now, simplified distribution
        
        // Placeholder: distribute equally to all registered miners
        // In production: distribute proportionally to consensus weights
    }

    /**
     * @notice Distribute rewards to validators based on trust scores
     */
    function _distributeValidatorRewards(uint16 subnetId, uint256 totalRewards) internal {
        // In production, fetch validator trust scores from Consensus contract
        // Distribute proportionally to trust alignment
        
        // Placeholder implementation
    }

    /**
     * @notice Distribute rewards to delegators proportionally
     */
    function _distributeDelegatorRewards(uint16 subnetId, uint256 totalRewards) internal {
        // In production, fetch delegation data from Staking contract
        // Distribute proportionally to delegation amounts
        
        // Placeholder implementation
    }

    /**
     * @notice Initialize emission schedule for a new subnet
     * @param subnetId Subnet ID
     * @param initialRate Initial emission rate
     */
    function initializeSubnet(uint16 subnetId, uint256 initialRate) external onlyRegistry {
        require(emissionSchedules[subnetId].emissionRate == 0, "Already initialized");
        
        emissionSchedules[subnetId] = EmissionSchedule({
            emissionRate: initialRate,
            totalEmitted: 0,
            lastDistribution: block.number,
            epoch: 0
        });
    }
}


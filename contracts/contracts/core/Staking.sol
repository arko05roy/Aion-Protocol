// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../libraries/StakeCalculation.sol";

/**
 * @title Staking
 * @notice Manages validator staking, delegation, and stake weight calculation
 * @dev Implements the stake weight formula: W = α + 0.18τ
 */
contract Staking is Ownable, ReentrancyGuard {
    using StakeCalculation for uint256;

    // Structs
    struct ValidatorStake {
        uint256 directStake;
        uint256 totalDelegated;
        uint256 lastUpdateBlock;
        bool active;
    }

    struct Delegation {
        uint256 amount;
        uint256 delegatedAt;
        uint256 unstakeRequestedAt;
    }

    // Constants
    uint256 public constant MIN_VALIDATOR_STAKE = 1 ether;
    uint256 public constant UNSTAKE_DELAY = 50400; // ~7 days in blocks (3s per block)
    uint256 public constant MIN_DELEGATION = 0.1 ether;

    // State variables
    address public registryContract;
    mapping(uint16 => mapping(address => ValidatorStake)) public validatorStakes; // subnetId => validator => stake
    mapping(uint16 => mapping(address => mapping(address => Delegation))) public delegations; // subnetId => delegator => validator => delegation
    mapping(uint16 => mapping(address => uint256)) public pendingUnstakes; // subnetId => address => amount
    mapping(uint16 => uint256) public totalSubnetStake;

    // Events
    event ValidatorStaked(uint16 indexed subnetId, address indexed validator, uint256 amount);
    event Delegated(uint16 indexed subnetId, address indexed delegator, address indexed validator, uint256 amount);
    event UnstakeRequested(uint16 indexed subnetId, address indexed staker, uint256 amount, uint256 availableAt);
    event Unstaked(uint16 indexed subnetId, address indexed staker, uint256 amount);
    event DelegationWithdrawn(uint16 indexed subnetId, address indexed delegator, address indexed validator, uint256 amount);

    // Modifiers
    modifier onlyRegistry() {
        require(msg.sender == registryContract, "Only registry");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the registry contract address
     * @param _registryContract Address of the Registry contract
     */
    function setRegistryContract(address _registryContract) external onlyOwner {
        require(_registryContract != address(0), "Invalid registry address");
        registryContract = _registryContract;
    }

    /**
     * @notice Stake as a validator
     * @param subnetId Target subnet ID
     * @param amount Amount to stake
     */
    function stakeValidator(uint16 subnetId, uint256 amount) external payable nonReentrant {
        require(msg.value == amount, "Incorrect value sent");
        require(amount >= MIN_VALIDATOR_STAKE, "Stake below minimum");

        ValidatorStake storage stake = validatorStakes[subnetId][msg.sender];
        stake.directStake += amount;
        stake.lastUpdateBlock = block.number;
        stake.active = true;

        totalSubnetStake[subnetId] += amount;

        emit ValidatorStaked(subnetId, msg.sender, amount);
    }

    /**
     * @notice Delegate stake to a validator
     * @param subnetId Target subnet ID
     * @param validator Validator address to delegate to
     * @param amount Amount to delegate
     */
    function delegate(
        uint16 subnetId,
        address validator,
        uint256 amount
    ) external payable nonReentrant {
        require(msg.value == amount, "Incorrect value sent");
        require(amount >= MIN_DELEGATION, "Delegation below minimum");
        require(validatorStakes[subnetId][validator].active, "Validator not active");

        Delegation storage delegation = delegations[subnetId][msg.sender][validator];
        delegation.amount += amount;
        delegation.delegatedAt = block.timestamp;

        validatorStakes[subnetId][validator].totalDelegated += amount;
        totalSubnetStake[subnetId] += amount;

        emit Delegated(subnetId, msg.sender, validator, amount);
    }

    /**
     * @notice Request to unstake validator stake
     * @param subnetId Subnet ID
     * @param amount Amount to unstake
     */
    function requestUnstake(uint16 subnetId, uint256 amount) external nonReentrant {
        ValidatorStake storage stake = validatorStakes[subnetId][msg.sender];
        require(stake.directStake >= amount, "Insufficient stake");

        stake.directStake -= amount;
        pendingUnstakes[subnetId][msg.sender] += amount;
        totalSubnetStake[subnetId] -= amount;

        uint256 availableAt = block.number + UNSTAKE_DELAY;
        emit UnstakeRequested(subnetId, msg.sender, amount, availableAt);
    }

    /**
     * @notice Complete unstake after delay period
     * @param subnetId Subnet ID
     */
    function unstake(uint16 subnetId) external nonReentrant {
        uint256 amount = pendingUnstakes[subnetId][msg.sender];
        require(amount > 0, "No pending unstake");

        pendingUnstakes[subnetId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Unstaked(subnetId, msg.sender, amount);
    }

    /**
     * @notice Withdraw delegation
     * @param subnetId Subnet ID
     * @param validator Validator address
     */
    function withdrawDelegation(
        uint16 subnetId,
        address validator
    ) external nonReentrant {
        Delegation storage delegation = delegations[subnetId][msg.sender][validator];
        uint256 amount = delegation.amount;
        require(amount > 0, "No delegation");

        delegation.amount = 0;
        validatorStakes[subnetId][validator].totalDelegated -= amount;
        totalSubnetStake[subnetId] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit DelegationWithdrawn(subnetId, msg.sender, validator, amount);
    }

    /**
     * @notice Calculate validator stake weight
     * @param subnetId Subnet ID
     * @param validator Validator address
     * @return weight Stake weight (W = α + 0.18τ)
     */
    function calculateStakeWeight(
        uint16 subnetId,
        address validator
    ) public view returns (uint256 weight) {
        ValidatorStake memory stake = validatorStakes[subnetId][validator];
        weight = StakeCalculation.calculateWeight(stake.directStake, stake.totalDelegated);
    }

    /**
     * @notice Get validator stake information
     * @param subnetId Subnet ID
     * @param validator Validator address
     * @return ValidatorStake struct
     */
    function getValidatorStake(
        uint16 subnetId,
        address validator
    ) external view returns (ValidatorStake memory) {
        return validatorStakes[subnetId][validator];
    }

    /**
     * @notice Get delegation information
     * @param subnetId Subnet ID
     * @param delegator Delegator address
     * @param validator Validator address
     * @return Delegation struct
     */
    function getDelegation(
        uint16 subnetId,
        address delegator,
        address validator
    ) external view returns (Delegation memory) {
        return delegations[subnetId][delegator][validator];
    }

    /**
     * @notice Get total stake in a subnet
     * @param subnetId Subnet ID
     * @return Total staked amount
     */
    function getTotalSubnetStake(uint16 subnetId) external view returns (uint256) {
        return totalSubnetStake[subnetId];
    }
}


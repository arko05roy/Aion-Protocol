// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Registry
 * @notice Manages subnet creation, neuron registration, and UID assignment
 * @dev Core contract for the AIon Protocol subnet registry
 */
contract Registry is Ownable, ReentrancyGuard {
    // Structs
    struct Subnet {
        address governor;
        uint16 maxNeurons;
        uint16 validatorLimit;
        uint256 emissionRate;
        bytes32 incentiveFunctionHash;
        uint16 neuronCount;
        uint256 createdAt;
        bool active;
    }

    struct Neuron {
        address hotkey;
        address coldkey;
        uint16 uid;
        uint16 subnetId;
        uint256 registeredAt;
        uint256 immunityUntil;
        bool active;
    }

    // Constants
    uint256 public constant IMMUNITY_PERIOD = 7200; // ~2 hours in blocks (3s per block)
    uint16 public constant MAX_SUBNET_ID = 4096;
    uint16 public constant MAX_NEURONS_PER_SUBNET = 256;

    // State variables
    uint16 public subnetCount;
    mapping(uint16 => Subnet) public subnets;
    mapping(uint16 => mapping(uint16 => Neuron)) public neurons; // subnetId => uid => Neuron
    mapping(uint16 => mapping(address => uint16)) public hotkeyToUid; // subnetId => hotkey => uid
    mapping(address => mapping(uint16 => bool)) public isRegistered; // hotkey => subnetId => bool

    // Events
    event SubnetCreated(
        uint16 indexed subnetId,
        address indexed governor,
        uint16 maxNeurons,
        uint16 validatorLimit,
        uint256 emissionRate
    );
    event SubnetConfigUpdated(
        uint16 indexed subnetId,
        uint16 validatorLimit,
        uint256 emissionRate
    );
    event NeuronRegistered(
        uint16 indexed subnetId,
        uint16 indexed uid,
        address indexed hotkey,
        address coldkey
    );
    event NeuronPruned(
        uint16 indexed subnetId,
        uint16 indexed uid,
        address indexed hotkey
    );
    event GovernorTransferred(
        uint16 indexed subnetId,
        address indexed oldGovernor,
        address indexed newGovernor
    );

    // Modifiers
    modifier onlyGovernor(uint16 subnetId) {
        require(subnets[subnetId].governor == msg.sender, "Not governor");
        _;
    }

    modifier subnetExists(uint16 subnetId) {
        require(subnets[subnetId].active, "Subnet does not exist");
        _;
    }

    modifier neuronExists(uint16 subnetId, uint16 uid) {
        require(neurons[subnetId][uid].active, "Neuron does not exist");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new subnet
     * @param maxNeurons Maximum number of neurons allowed
     * @param validatorLimit Number of validator permits
     * @param emissionRate Emission rate per epoch
     * @param incentiveFunctionHash Hash of the incentive function
     * @return subnetId The ID of the newly created subnet
     */
    function createSubnet(
        uint16 maxNeurons,
        uint16 validatorLimit,
        uint256 emissionRate,
        bytes32 incentiveFunctionHash
    ) external returns (uint16 subnetId) {
        require(maxNeurons > 0 && maxNeurons <= MAX_NEURONS_PER_SUBNET, "Invalid max neurons");
        require(validatorLimit > 0 && validatorLimit <= maxNeurons, "Invalid validator limit");
        require(subnetCount < MAX_SUBNET_ID, "Max subnets reached");

        subnetId = subnetCount++;
        
        subnets[subnetId] = Subnet({
            governor: msg.sender,
            maxNeurons: maxNeurons,
            validatorLimit: validatorLimit,
            emissionRate: emissionRate,
            incentiveFunctionHash: incentiveFunctionHash,
            neuronCount: 0,
            createdAt: block.timestamp,
            active: true
        });

        emit SubnetCreated(subnetId, msg.sender, maxNeurons, validatorLimit, emissionRate);
    }

    /**
     * @notice Register a new neuron in a subnet
     * @param subnetId Target subnet ID
     * @param hotkey Neuron's hot key address
     * @param coldkey Neuron's cold key address
     * @param proofOfWork Proof of work for registration
     * @return uid The assigned UID for the neuron
     */
    function registerNeuron(
        uint16 subnetId,
        address hotkey,
        address coldkey,
        bytes calldata proofOfWork
    ) external nonReentrant subnetExists(subnetId) returns (uint16 uid) {
        require(hotkey != address(0) && coldkey != address(0), "Invalid addresses");
        require(!isRegistered[hotkey][subnetId], "Hotkey already registered");
        require(subnets[subnetId].neuronCount < subnets[subnetId].maxNeurons, "Subnet full");
        require(_verifyProofOfWork(hotkey, subnetId, proofOfWork), "Invalid PoW");

        uid = subnets[subnetId].neuronCount++;
        
        neurons[subnetId][uid] = Neuron({
            hotkey: hotkey,
            coldkey: coldkey,
            uid: uid,
            subnetId: subnetId,
            registeredAt: block.timestamp,
            immunityUntil: block.timestamp + IMMUNITY_PERIOD,
            active: true
        });

        hotkeyToUid[subnetId][hotkey] = uid;
        isRegistered[hotkey][subnetId] = true;

        emit NeuronRegistered(subnetId, uid, hotkey, coldkey);
    }

    /**
     * @notice Update subnet configuration
     * @param subnetId Subnet ID
     * @param validatorLimit New validator limit
     * @param emissionRate New emission rate
     */
    function updateSubnetConfig(
        uint16 subnetId,
        uint16 validatorLimit,
        uint256 emissionRate
    ) external onlyGovernor(subnetId) subnetExists(subnetId) {
        require(validatorLimit > 0 && validatorLimit <= subnets[subnetId].maxNeurons, "Invalid validator limit");

        subnets[subnetId].validatorLimit = validatorLimit;
        subnets[subnetId].emissionRate = emissionRate;

        emit SubnetConfigUpdated(subnetId, validatorLimit, emissionRate);
    }

    /**
     * @notice Prune a low-performing neuron
     * @param subnetId Subnet ID
     * @param uid Neuron UID to prune
     */
    function pruneNeuron(
        uint16 subnetId,
        uint16 uid
    ) external onlyGovernor(subnetId) neuronExists(subnetId, uid) {
        Neuron storage neuron = neurons[subnetId][uid];
        require(block.timestamp > neuron.immunityUntil, "Neuron has immunity");

        address hotkey = neuron.hotkey;
        neuron.active = false;
        isRegistered[hotkey][subnetId] = false;

        emit NeuronPruned(subnetId, uid, hotkey);
    }

    /**
     * @notice Transfer subnet governance
     * @param subnetId Subnet ID
     * @param newGovernor New governor address
     */
    function transferGovernor(
        uint16 subnetId,
        address newGovernor
    ) external onlyGovernor(subnetId) subnetExists(subnetId) {
        require(newGovernor != address(0), "Invalid governor address");
        
        address oldGovernor = subnets[subnetId].governor;
        subnets[subnetId].governor = newGovernor;

        emit GovernorTransferred(subnetId, oldGovernor, newGovernor);
    }

    /**
     * @notice Get subnet information
     * @param subnetId Subnet ID
     * @return Subnet struct
     */
    function getSubnet(uint16 subnetId) external view returns (Subnet memory) {
        return subnets[subnetId];
    }

    /**
     * @notice Get neuron information
     * @param subnetId Subnet ID
     * @param uid Neuron UID
     * @return Neuron struct
     */
    function getNeuron(uint16 subnetId, uint16 uid) external view returns (Neuron memory) {
        return neurons[subnetId][uid];
    }

    /**
     * @notice Get UID by hotkey
     * @param subnetId Subnet ID
     * @param hotkey Neuron hotkey
     * @return uid Neuron UID
     */
    function getUidByHotkey(uint16 subnetId, address hotkey) external view returns (uint16) {
        require(isRegistered[hotkey][subnetId], "Hotkey not registered");
        return hotkeyToUid[subnetId][hotkey];
    }

    /**
     * @notice Verify proof of work (simplified - implement proper PoW in production)
     * @dev This is a placeholder - implement proper PoW verification
     */
    function _verifyProofOfWork(
        address hotkey,
        uint16 subnetId,
        bytes calldata proofOfWork
    ) internal pure returns (bool) {
        // Simplified PoW check - in production, implement proper difficulty-based PoW
        return proofOfWork.length >= 32;
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Hive
 * @notice Global metagraph registry and inter-subnet coordination
 * @dev Manages cross-subnet interactions and global governance
 */
contract Hive is Ownable, ReentrancyGuard {
    // Structs
    struct SubnetInfo {
        bool active;
        uint256 totalEmissions;
        uint256 totalStake;
        uint256 neuronCount;
        address governor;
        uint256 registeredAt;
    }

    struct CrossSubnetMessage {
        uint16 sourceSubnet;
        uint16 targetSubnet;
        bytes data;
        uint256 timestamp;
        bool executed;
    }

    struct GovernanceProposal {
        uint256 id;
        address proposer;
        bytes proposal;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 createdAt;
        uint256 executionTime;
        bool executed;
        bool cancelled;
    }

    // Constants
    uint256 public constant PROPOSAL_THRESHOLD = 100 ether; // Minimum stake to propose
    uint256 public constant VOTING_PERIOD = 50400; // ~7 days in blocks
    uint256 public constant EXECUTION_DELAY = 7200; // ~1 day in blocks

    // State variables
    address public registryContract;
    address public consensusContract;
    address public stakingContract;
    address public emissionsContract;

    uint16[] public activeSubnets;
    mapping(uint16 => SubnetInfo) public subnetInfo;
    mapping(uint16 => bool) public isSubnetRegistered;

    uint256 public messageCount;
    mapping(uint256 => CrossSubnetMessage) public messages;
    mapping(uint16 => mapping(uint16 => bool)) public subnetConnections; // source => target => connected

    uint256 public proposalCount;
    mapping(uint256 => GovernanceProposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Events
    event SubnetRegistered(uint16 indexed subnetId, address indexed governor);
    event SubnetUpdated(uint16 indexed subnetId, uint256 totalEmissions, uint256 totalStake);
    event CrossSubnetMessageSent(uint256 indexed messageId, uint16 indexed sourceSubnet, uint16 indexed targetSubnet);
    event CrossSubnetMessageExecuted(uint256 indexed messageId);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set contract addresses
     * @param _registryContract Registry contract
     * @param _consensusContract Consensus contract
     * @param _stakingContract Staking contract
     * @param _emissionsContract Emissions contract
     */
    function setContracts(
        address _registryContract,
        address _consensusContract,
        address _stakingContract,
        address _emissionsContract
    ) external onlyOwner {
        require(
            _registryContract != address(0) &&
            _consensusContract != address(0) &&
            _stakingContract != address(0) &&
            _emissionsContract != address(0),
            "Invalid addresses"
        );
        registryContract = _registryContract;
        consensusContract = _consensusContract;
        stakingContract = _stakingContract;
        emissionsContract = _emissionsContract;
    }

    /**
     * @notice Register a subnet in the global metagraph
     * @param subnetId Subnet ID
     */
    function registerSubnet(uint16 subnetId) external {
        require(msg.sender == registryContract, "Only registry");
        require(!isSubnetRegistered[subnetId], "Already registered");

        subnetInfo[subnetId] = SubnetInfo({
            active: true,
            totalEmissions: 0,
            totalStake: 0,
            neuronCount: 0,
            governor: msg.sender,
            registeredAt: block.timestamp
        });

        activeSubnets.push(subnetId);
        isSubnetRegistered[subnetId] = true;

        emit SubnetRegistered(subnetId, msg.sender);
    }

    /**
     * @notice Update subnet statistics
     * @param subnetId Subnet ID
     * @param totalEmissions Total emissions
     * @param totalStake Total stake
     * @param neuronCount Number of neurons
     */
    function updateSubnetStats(
        uint16 subnetId,
        uint256 totalEmissions,
        uint256 totalStake,
        uint256 neuronCount
    ) external {
        require(
            msg.sender == emissionsContract || msg.sender == stakingContract || msg.sender == registryContract,
            "Not authorized"
        );
        require(isSubnetRegistered[subnetId], "Subnet not registered");

        SubnetInfo storage info = subnetInfo[subnetId];
        info.totalEmissions = totalEmissions;
        info.totalStake = totalStake;
        info.neuronCount = neuronCount;

        emit SubnetUpdated(subnetId, totalEmissions, totalStake);
    }

    /**
     * @notice Get global metagraph overview
     * @return subnets Array of active subnet IDs
     * @return emissions Array of total emissions per subnet
     */
    function getGlobalMetagraph() external view returns (
        uint16[] memory subnets,
        uint256[] memory emissions
    ) {
        subnets = activeSubnets;
        emissions = new uint256[](activeSubnets.length);

        for (uint256 i = 0; i < activeSubnets.length; i++) {
            emissions[i] = subnetInfo[activeSubnets[i]].totalEmissions;
        }
    }

    /**
     * @notice Send cross-subnet message
     * @param sourceSubnet Source subnet ID
     * @param targetSubnet Target subnet ID
     * @param data Message data
     * @return messageId Message ID
     */
    function coordinateCrossSubnet(
        uint16 sourceSubnet,
        uint16 targetSubnet,
        bytes calldata data
    ) external nonReentrant returns (uint256 messageId) {
        require(isSubnetRegistered[sourceSubnet] && isSubnetRegistered[targetSubnet], "Invalid subnets");
        require(subnetConnections[sourceSubnet][targetSubnet], "Subnets not connected");

        messageId = messageCount++;
        messages[messageId] = CrossSubnetMessage({
            sourceSubnet: sourceSubnet,
            targetSubnet: targetSubnet,
            data: data,
            timestamp: block.timestamp,
            executed: false
        });

        emit CrossSubnetMessageSent(messageId, sourceSubnet, targetSubnet);
    }

    /**
     * @notice Execute cross-subnet message
     * @param messageId Message ID
     */
    function executeMessage(uint256 messageId) external nonReentrant {
        CrossSubnetMessage storage message = messages[messageId];
        require(!message.executed, "Already executed");
        require(message.timestamp > 0, "Invalid message");

        message.executed = true;

        // In production, implement message execution logic
        // This could involve calling target subnet contracts

        emit CrossSubnetMessageExecuted(messageId);
    }

    /**
     * @notice Enable connection between two subnets
     * @param sourceSubnet Source subnet ID
     * @param targetSubnet Target subnet ID
     */
    function enableSubnetConnection(uint16 sourceSubnet, uint16 targetSubnet) external onlyOwner {
        require(isSubnetRegistered[sourceSubnet] && isSubnetRegistered[targetSubnet], "Invalid subnets");
        subnetConnections[sourceSubnet][targetSubnet] = true;
    }

    /**
     * @notice Create governance proposal
     * @param proposalData Proposal data
     * @return proposalId Proposal ID
     */
    function proposeGovernanceChange(bytes calldata proposalData) external nonReentrant returns (uint256 proposalId) {
        // In production, check proposer has minimum stake
        // require(getStake(msg.sender) >= PROPOSAL_THRESHOLD, "Insufficient stake");

        proposalId = proposalCount++;
        proposals[proposalId] = GovernanceProposal({
            id: proposalId,
            proposer: msg.sender,
            proposal: proposalData,
            votesFor: 0,
            votesAgainst: 0,
            createdAt: block.number,
            executionTime: block.number + VOTING_PERIOD + EXECUTION_DELAY,
            executed: false,
            cancelled: false
        });

        emit ProposalCreated(proposalId, msg.sender);
    }

    /**
     * @notice Vote on governance proposal
     * @param proposalId Proposal ID
     * @param support True for yes, false for no
     */
    function vote(uint256 proposalId, bool support) external nonReentrant {
        GovernanceProposal storage proposal = proposals[proposalId];
        require(block.number < proposal.createdAt + VOTING_PERIOD, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(!proposal.cancelled, "Proposal cancelled");

        // In production, get voter's stake weight
        uint256 weight = 1 ether; // Placeholder

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        hasVoted[proposalId][msg.sender] = true;

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Execute governance proposal
     * @param proposalId Proposal ID
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        GovernanceProposal storage proposal = proposals[proposalId];
        require(block.number >= proposal.executionTime, "Execution time not reached");
        require(!proposal.executed, "Already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal rejected");

        proposal.executed = true;

        // In production, execute proposal logic

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Get subnet information
     * @param subnetId Subnet ID
     * @return SubnetInfo struct
     */
    function getSubnetInfo(uint16 subnetId) external view returns (SubnetInfo memory) {
        return subnetInfo[subnetId];
    }

    /**
     * @notice Get all active subnets
     * @return Array of subnet IDs
     */
    function getActiveSubnets() external view returns (uint16[] memory) {
        return activeSubnets;
    }
}


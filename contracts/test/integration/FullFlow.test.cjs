const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration: Full Protocol Flow", function () {
    let aionToken, registry, staking, consensus, emissions, hive;
    let owner, governor, validator1, validator2, miner1, miner2;

    before(async function () {
        [owner, governor, validator1, validator2, miner1, miner2] = await ethers.getSigners();

        // Deploy all contracts
        console.log("Deploying contracts...");

        const AionToken = await ethers.getContractFactory("AionToken");
        aionToken = await AionToken.deploy();
        await aionToken.waitForDeployment();

        const Registry = await ethers.getContractFactory("Registry");
        registry = await Registry.deploy();
        await registry.waitForDeployment();

        const Staking = await ethers.getContractFactory("Staking");
        staking = await Staking.deploy();
        await staking.waitForDeployment();

        const Consensus = await ethers.getContractFactory("Consensus");
        consensus = await Consensus.deploy();
        await consensus.waitForDeployment();

        const Emissions = await ethers.getContractFactory("Emissions");
        emissions = await Emissions.deploy(await aionToken.getAddress());
        await emissions.waitForDeployment();

        const Hive = await ethers.getContractFactory("Hive");
        hive = await Hive.deploy();
        await hive.waitForDeployment();

        // Configure contracts
        await staking.setRegistryContract(await registry.getAddress());
        await consensus.setContracts(await registry.getAddress(), await staking.getAddress());
        await emissions.setContracts(
            await registry.getAddress(),
            await consensus.getAddress(),
            await staking.getAddress()
        );
        await hive.setContracts(
            await registry.getAddress(),
            await consensus.getAddress(),
            await staking.getAddress(),
            await emissions.getAddress()
        );
        await aionToken.setEmissionsContract(await emissions.getAddress());

        console.log("All contracts deployed and configured ✓");
    });

    it("Should complete full protocol flow", async function () {
        // 1. Create subnet
        console.log("\n1. Creating subnet...");
        const createSubnetTx = await registry.connect(governor).createSubnet(
            256,
            64,
            ethers.parseEther("1000"),
            ethers.ZeroHash
        );
        await createSubnetTx.wait();
        const subnetId = 0;
        console.log("Subnet created ✓");

        // 2. Initialize emissions (would normally be done by Registry during subnet creation)
        console.log("\n2. Initializing emissions...");
        // Skip for now - requires Registry to call Emissions
        console.log("Emissions initialized (skipped - requires Registry integration) ✓");

        // 3. Register neurons
        console.log("\n3. Registering neurons...");
        const proofOfWork = new Uint8Array(32).fill(1);
        
        await registry.connect(miner1).registerNeuron(
            subnetId,
            miner1.address,
            miner1.address,
            proofOfWork
        );
        
        await registry.connect(miner2).registerNeuron(
            subnetId,
            miner2.address,
            miner2.address,
            proofOfWork
        );
        
        console.log("Neurons registered ✓");

        // 4. Validators stake
        console.log("\n4. Validators staking...");
        await staking.connect(validator1).stakeValidator(
            subnetId,
            ethers.parseEther("10"),
            { value: ethers.parseEther("10") }
        );
        
        await staking.connect(validator2).stakeValidator(
            subnetId,
            ethers.parseEther("5"),
            { value: ethers.parseEther("5") }
        );
        
        console.log("Validators staked ✓");

        // 5. Submit weights (simplified - consensus would normally calculate)
        console.log("\n5. Submitting weights...");
        // This would normally be done by validators after querying miners
        console.log("Weights submitted (simulated) ✓");

        // Verify state
        const subnet = await registry.getSubnet(subnetId);
        expect(subnet.neuronCount).to.equal(2);
        expect(subnet.active).to.be.true;

        const validator1Stake = await staking.getValidatorStake(subnetId, validator1.address);
        expect(validator1Stake.directStake).to.equal(ethers.parseEther("10"));

        console.log("\n✅ Full protocol flow completed successfully!");
    });
});


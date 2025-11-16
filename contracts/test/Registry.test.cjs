const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Registry", function () {
    let registry;
    let owner, governor, miner1, miner2;

    beforeEach(async function () {
        [owner, governor, miner1, miner2] = await ethers.getSigners();

        const Registry = await ethers.getContractFactory("Registry");
        registry = await Registry.deploy();
        await registry.waitForDeployment();
    });

    describe("Subnet Creation", function () {
        it("Should create a subnet successfully", async function () {
            const tx = await registry.createSubnet(
                256, // maxNeurons
                64,  // validatorLimit
                ethers.parseEther("1000"), // emissionRate
                ethers.ZeroHash // incentiveFunctionHash
            );

            await expect(tx)
                .to.emit(registry, "SubnetCreated")
                .withArgs(0, owner.address, 256, 64, ethers.parseEther("1000"));

            const subnet = await registry.getSubnet(0);
            expect(subnet.governor).to.equal(owner.address);
            expect(subnet.maxNeurons).to.equal(256);
            expect(subnet.validatorLimit).to.equal(64);
            expect(subnet.active).to.be.true;
        });

        it("Should reject invalid subnet parameters", async function () {
            await expect(
                registry.createSubnet(0, 64, ethers.parseEther("1000"), ethers.ZeroHash)
            ).to.be.revertedWith("Invalid max neurons");

            await expect(
                registry.createSubnet(256, 300, ethers.parseEther("1000"), ethers.ZeroHash)
            ).to.be.revertedWith("Invalid validator limit");
        });
    });

    describe("Neuron Registration", function () {
        let subnetId;

        beforeEach(async function () {
            const tx = await registry.createSubnet(256, 64, ethers.parseEther("1000"), ethers.ZeroHash);
            await tx.wait();
            subnetId = 0;
        });

        it("Should register a neuron successfully", async function () {
            const proofOfWork = new Uint8Array(32).fill(1);

            const tx = await registry.registerNeuron(
                subnetId,
                miner1.address,
                miner1.address,
                proofOfWork
            );

            await expect(tx)
                .to.emit(registry, "NeuronRegistered")
                .withArgs(subnetId, 0, miner1.address, miner1.address);

            const neuron = await registry.getNeuron(subnetId, 0);
            expect(neuron.hotkey).to.equal(miner1.address);
            expect(neuron.active).to.be.true;
        });

        it("Should prevent duplicate registration", async function () {
            const proofOfWork = new Uint8Array(32).fill(1);

            await registry.registerNeuron(subnetId, miner1.address, miner1.address, proofOfWork);

            await expect(
                registry.registerNeuron(subnetId, miner1.address, miner1.address, proofOfWork)
            ).to.be.revertedWith("Hotkey already registered");
        });

        it("Should assign sequential UIDs", async function () {
            const proofOfWork = new Uint8Array(32).fill(1);

            await registry.registerNeuron(subnetId, miner1.address, miner1.address, proofOfWork);
            await registry.registerNeuron(subnetId, miner2.address, miner2.address, proofOfWork);

            const uid1 = await registry.getUidByHotkey(subnetId, miner1.address);
            const uid2 = await registry.getUidByHotkey(subnetId, miner2.address);

            expect(uid1).to.equal(0);
            expect(uid2).to.equal(1);
        });
    });

    describe("Subnet Configuration", function () {
        let subnetId;

        beforeEach(async function () {
            const tx = await registry.connect(governor).createSubnet(
                256, 64, ethers.parseEther("1000"), ethers.ZeroHash
            );
            await tx.wait();
            subnetId = 0;
        });

        it("Should allow governor to update config", async function () {
            await registry.connect(governor).updateSubnetConfig(subnetId, 32, ethers.parseEther("2000"));

            const subnet = await registry.getSubnet(subnetId);
            expect(subnet.validatorLimit).to.equal(32);
            expect(subnet.emissionRate).to.equal(ethers.parseEther("2000"));
        });

        it("Should prevent non-governor from updating config", async function () {
            await expect(
                registry.connect(miner1).updateSubnetConfig(subnetId, 32, ethers.parseEther("2000"))
            ).to.be.revertedWith("Not governor");
        });
    });
});


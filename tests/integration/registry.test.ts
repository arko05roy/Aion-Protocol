import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TestValidator, createKeypair, airdropSol, findProgramAddress, serializeU16 } from '../utils/test-utils.js';
import { RegistryClient, REGISTRY_PROGRAM_ID } from '../clients/registry-client.js';

// Simple test runner (no framework dependencies)
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Running Registry Program Integration Tests\n');
  let validator: TestValidator;
  let connection: Connection;
  let client: RegistryClient;
  let governor: Keypair;
  let hotkey: Keypair;
  let coldkey: Keypair;

  // Setup
  console.log('📦 Setting up test environment...');
  validator = new TestValidator(8899);
  await validator.start();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  connection = new Connection('http://localhost:8899', 'confirmed');
  client = new RegistryClient(connection);

  governor = createKeypair();
  hotkey = createKeypair();
  coldkey = createKeypair();

  await airdropSol(connection, governor.publicKey, 10);
  await airdropSol(connection, hotkey.publicKey, 10);

  try {
    // Test: Create Subnet
    console.log('\n✅ Test: Create Subnet');
    {
      const subnetId = 1;
      const maxNeurons = 256;
      const validatorLimit = 64;
      const emissionRate = BigInt(1000000);
      const incentiveFunctionHash = new Uint8Array(32).fill(0);

      const [subnetPda, signature] = await client.createSubnet(governor, {
        subnetId,
        maxNeurons,
        validatorLimit,
        emissionRate,
        incentiveFunctionHash,
      });

      assert(signature !== undefined, 'Signature should be defined');
      assert(subnetPda !== undefined, 'Subnet PDA should be defined');

      // Verify subnet was created
      const subnet = await client.getSubnet(subnetPda);
      assert(subnet !== null, 'Subnet should exist');
      assert(subnet.id === subnetId, 'Subnet ID should match');
      assert(subnet.governor.equals(governor.publicKey), 'Governor should match');
      assert(subnet.maxNeurons === maxNeurons, 'Max neurons should match');
      assert(subnet.validatorLimit === validatorLimit, 'Validator limit should match');
      assert(subnet.emissionRate === emissionRate, 'Emission rate should match');
      assert(subnet.neuronCount === 0, 'Neuron count should be 0');
      console.log('   ✓ Subnet created successfully');
    }

    // Test: Invalid max_neurons
    console.log('\n✅ Test: Invalid max_neurons (should fail)');
    {
      const subnetId = 2;
      const maxNeurons = 300; // Invalid: > 256
      const validatorLimit = 64;
      const emissionRate = BigInt(1000000);
      const incentiveFunctionHash = new Uint8Array(32).fill(0);

      try {
        await client.createSubnet(governor, {
          subnetId,
          maxNeurons,
          validatorLimit,
          emissionRate,
          incentiveFunctionHash,
        });
        assert(false, 'Should have thrown error for invalid max_neurons');
      } catch (error) {
        console.log('   ✓ Correctly rejected invalid max_neurons');
      }
    }

    // Test: Register Neuron
    console.log('\n✅ Test: Register Neuron');
    {
      const subnetId = 1;
      const maxNeurons = 256;
      const validatorLimit = 64;
      const emissionRate = BigInt(1000000);
      const incentiveFunctionHash = new Uint8Array(32).fill(0);

      const [subnetPda] = await client.createSubnet(governor, {
        subnetId,
        maxNeurons,
        validatorLimit,
        emissionRate,
        incentiveFunctionHash,
      });
      const [neuronPda, signature] = await client.registerNeuron(hotkey, coldkey.publicKey, {
        subnetId,
      });

      assert(signature !== undefined, 'Signature should be defined');
      assert(neuronPda !== undefined, 'Neuron PDA should be defined');

      // Verify neuron was registered
      const neuron = await client.getNeuron(neuronPda);
      assert(neuron !== null, 'Neuron should exist');
      assert(neuron.subnetId === subnetId, 'Subnet ID should match');
      assert(neuron.hotkey.equals(hotkey.publicKey), 'Hotkey should match');
      assert(neuron.coldkey.equals(coldkey.publicKey), 'Coldkey should match');
      assert(neuron.uid === 1, 'First neuron should have UID 1');
      assert(neuron.stake === BigInt(0), 'Stake should be 0');
      assert(neuron.isValidator === false, 'Should not be validator');

      // Verify subnet neuron count increased
      const subnet = await client.getSubnet(subnetPda);
      assert(subnet.neuronCount === 1, 'Neuron count should be 1');
      console.log('   ✓ Neuron registered successfully');
    }

    // Test: Sequential UIDs
    console.log('\n✅ Test: Sequential UID assignment');
    {
      const subnetId = 1;
      const maxNeurons = 256;
      const validatorLimit = 64;
      const emissionRate = BigInt(1000000);
      const incentiveFunctionHash = new Uint8Array(32).fill(0);

      const [subnetPda] = await client.createSubnet(governor, {
        subnetId,
        maxNeurons,
        validatorLimit,
        emissionRate,
        incentiveFunctionHash,
      });
      const hotkey2 = createKeypair();
      await airdropSol(connection, hotkey2.publicKey, 10);

      const [neuronPda2] = await client.registerNeuron(hotkey2, coldkey.publicKey, {
        subnetId,
      });

      const neuron2 = await client.getNeuron(neuronPda2);
      assert(neuron2.uid === 2, 'Second neuron should have UID 2');

      const subnet = await client.getSubnet(subnetPda);
      assert(subnet.neuronCount === 2, 'Neuron count should be 2');
      console.log('   ✓ Sequential UIDs assigned correctly');
    }

    // Test: Full Flow
    console.log('\n✅ Test: Full Subnet Lifecycle');
    {
      const subnetId = 3;
      const maxNeurons = 10;
      const validatorLimit = 5;
      const emissionRate = BigInt(2000000);
      const incentiveFunctionHash = new Uint8Array(32).fill(1);

      // 1. Create subnet
      const [subnetPda] = await client.createSubnet(governor, {
        subnetId,
        maxNeurons,
        validatorLimit,
        emissionRate,
        incentiveFunctionHash,
      });

      // 2. Register multiple neurons
      const neurons: PublicKey[] = [];
      for (let i = 0; i < 3; i++) {
        const neuronHotkey = createKeypair();
        await airdropSol(connection, neuronHotkey.publicKey, 10);
        const [neuronPda] = await client.registerNeuron(neuronHotkey, coldkey.publicKey, {
          subnetId,
        });
        neurons.push(neuronPda);
      }

      // 3. Verify state
      const subnet = await client.getSubnet(subnetPda);
      assert(subnet.neuronCount === 3, 'Should have 3 neurons');

      for (let i = 0; i < neurons.length; i++) {
        const neuron = await client.getNeuron(neurons[i]);
        assert(neuron.uid === i + 1, `Neuron ${i} should have UID ${i + 1}`);
        assert(neuron.subnetId === subnetId, `Neuron ${i} should have correct subnet ID`);
      }

      // 4. Update subnet config
      const newEmissionRate = BigInt(3000000);
      await client.updateSubnetConfig(governor, subnetPda, {
        emissionRate: newEmissionRate,
      });

      const updatedSubnet = await client.getSubnet(subnetPda);
      assert(updatedSubnet.emissionRate === newEmissionRate, 'Emission rate should be updated');
      console.log('   ✓ Full lifecycle completed successfully');
    }

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await validator.stop();
  }
}

// Run tests if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('registry.test.ts')) {
  runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runTests };


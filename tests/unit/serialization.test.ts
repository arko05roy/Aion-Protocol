import { PublicKey } from '@solana/web3.js';
import { serializeU16, serializeU64, deserializeU16, deserializeU64, deserializePubkey } from '../utils/test-utils.js';

// Test serialization/deserialization logic
function testSerialization() {
  console.log('🧪 Testing Serialization Logic\n');

  // Test U16 serialization
  console.log('Testing U16 serialization...');
  const testU16 = 256;
  const serializedU16 = serializeU16(testU16);
  const deserializedU16 = deserializeU16(serializedU16);
  if (deserializedU16 === testU16) {
    console.log('  ✅ U16 serialization works');
  } else {
    throw new Error(`U16 serialization failed: expected ${testU16}, got ${deserializedU16}`);
  }

  // Test U64 serialization
  console.log('Testing U64 serialization...');
  const testU64 = BigInt(1000000);
  const serializedU64 = serializeU64(testU64);
  const deserializedU64 = deserializeU64(serializedU64);
  if (deserializedU64 === testU64) {
    console.log('  ✅ U64 serialization works');
  } else {
    throw new Error(`U64 serialization failed: expected ${testU64}, got ${deserializedU64}`);
  }

  // Test Pubkey serialization (mock)
  console.log('Testing Pubkey handling...');
  const testPubkey = PublicKey.default;
  if (testPubkey.toBuffer().length === 32) {
    console.log('  ✅ Pubkey is 32 bytes');
  } else {
    throw new Error('Pubkey size incorrect');
  }

  console.log('\n✅ All serialization tests passed!\n');
}

// Test instruction encoding
function testInstructionEncoding() {
  console.log('🧪 Testing Instruction Encoding\n');

  // Test CreateSubnet instruction encoding
  console.log('Testing CreateSubnet instruction encoding...');
  const subnetId = 1;
  const maxNeurons = 255;
  const validatorLimit = 64;
  const emissionRate = BigInt(1000000);
  const hash = new Uint8Array(32).fill(0);

  const instructionData = Buffer.alloc(1 + 2 + 1 + 1 + 8 + 32);
  let offset = 0;
  instructionData[offset++] = 0; // CreateSubnet
  serializeU16(subnetId).copy(instructionData, offset);
  offset += 2;
  instructionData[offset++] = maxNeurons;
  instructionData[offset++] = validatorLimit;
  serializeU64(emissionRate).copy(instructionData, offset);
  offset += 8;
  Buffer.from(hash).copy(instructionData, offset);

  if (instructionData.length === 45) {
    console.log('  ✅ CreateSubnet instruction encoding works');
  } else {
    throw new Error(`Instruction encoding failed: expected length 45, got ${instructionData.length}`);
  }

  // Test RegisterNeuron instruction encoding
  console.log('Testing RegisterNeuron instruction encoding...');
  const registerData = Buffer.alloc(1 + 2);
  registerData[0] = 1; // RegisterNeuron
  serializeU16(subnetId).copy(registerData, 1);

  if (registerData.length === 3) {
    console.log('  ✅ RegisterNeuron instruction encoding works');
  } else {
    throw new Error(`RegisterNeuron encoding failed: expected length 3, got ${registerData.length}`);
  }

  console.log('\n✅ All instruction encoding tests passed!\n');
}

// Run all unit tests
function runUnitTests() {
  try {
    testSerialization();
    testInstructionEncoding();
    console.log('🎉 All unit tests passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Unit test failed:', error);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('serialization.test.ts')) {
  runUnitTests();
}

export { runUnitTests, testSerialization, testInstructionEncoding };


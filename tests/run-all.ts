import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

async function runTests() {
  console.log('🚀 Starting PoI Protocol Test Suite\n');

  // Check if test validator is available
  try {
    const { execSync } = await import('child_process');
    execSync('which solana-test-validator', { stdio: 'ignore' });
  } catch {
    console.error('❌ solana-test-validator not found. Please install Solana CLI.');
    console.error('   Install: sh -c "$(curl -sSfL https://release.solana.com/stable/install)"');
    process.exit(1);
  }

  // Run integration tests
  console.log('📦 Running integration tests...\n');
  
  const testFiles = [
    'tests/integration/registry.test.ts',
  ];

  for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
      console.log(`\n🧪 Running ${testFile}...\n`);
      await runTestFile(testFile);
    }
  }

  console.log('\n✅ All tests completed!\n');
}

function runTestFile(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['tsx', file], {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});


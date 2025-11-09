import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROGRAM_ID = new PublicKey('iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u');
const TESTNET_URL = 'https://api.testnet.solana.com';

async function deployToTestnet() {
  console.log('🚀 Deploying PoI Registry Program to Solana Testnet\n');

  // Check if Solana CLI is available
  try {
    execSync('solana --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Solana CLI not found. Please install it first.');
    process.exit(1);
  }

  // Set testnet
  console.log('📡 Configuring for testnet...');
  execSync('solana config set --url https://api.testnet.solana.com', { stdio: 'inherit' });

  // Check balance
  console.log('💰 Checking balance...');
  const connection = new Connection(TESTNET_URL, 'confirmed');
  const keypairPath = process.env.SOLANA_KEYPAIR || path.join(process.env.HOME || '', '.config/solana/id.json');
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Keypair not found at ${keypairPath}`);
    console.log('Please set SOLANA_KEYPAIR environment variable or ensure default keypair exists');
    process.exit(1);
  }

  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')))
  );

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Current balance: ${balance / 1e9} SOL`);

  if (balance < 1e9) {
    console.log('⚠️  Low balance. Requesting airdrop...');
    try {
      const signature = await connection.requestAirdrop(keypair.publicKey, 2e9);
      await connection.confirmTransaction(signature);
      console.log('✅ Airdrop received');
    } catch (error) {
      console.error('❌ Airdrop failed:', error);
      console.log('Please request airdrop manually: solana airdrop 2');
    }
  }

  // Build program
  console.log('\n🔨 Building program...');
  const programDir = path.join(process.cwd(), 'programs/registry-native');
  try {
    execSync('cargo build-sbf', { cwd: programDir, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  // Deploy
  console.log('\n🚀 Deploying to testnet...');
  const soFile = path.join(programDir, 'target/deploy/poi_registry_native.so');
  const keypairFile = path.join(programDir, 'target/deploy/poi_registry_native-keypair.json');

  if (!fs.existsSync(soFile)) {
    console.error(`❌ Program .so file not found at ${soFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(keypairFile)) {
    console.log('⚠️  Program keypair not found. Generating...');
    execSync(`solana-keygen new --outfile ${keypairFile} --force`, { stdio: 'inherit' });
  }

  try {
    execSync(
      `solana program deploy --program-id ${keypairFile} ${soFile} --url ${TESTNET_URL}`,
      { stdio: 'inherit' }
    );
  } catch (error) {
    console.error('❌ Deployment failed');
    process.exit(1);
  }

  // Verify
  console.log('\n✅ Verifying deployment...');
  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (programInfo) {
      console.log('✅ Program deployed successfully!');
      console.log(`Program ID: ${PROGRAM_ID.toString()}`);
      console.log(`Program Data Length: ${programInfo.data.length} bytes`);
      console.log(`Owner: ${programInfo.owner.toString()}`);
    } else {
      console.error('❌ Program not found on-chain');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

deployToTestnet().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});


import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate or load keypair for program deployment
 * 
 * The program ID is: iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u
 * 
 * IMPORTANT: If you already have the keypair file for this program ID,
 * just place it at: target/deploy/poi_registry_native-keypair.json
 */

const PROGRAM_ID = 'iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u';
const KEYPAIR_PATH = path.join(process.cwd(), 'target/deploy/poi_registry_native-keypair.json');

async function generateKeypair() {
  console.log('🔑 Keypair Generator for PoI Registry Program\n');
  console.log(`Target Program ID: ${PROGRAM_ID}\n`);

  // Check if keypair already exists
  if (fs.existsSync(KEYPAIR_PATH)) {
    const existingKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8')))
    );
    const existingPubkey = existingKeypair.publicKey.toString();

    console.log(`✅ Keypair file already exists at: ${KEYPAIR_PATH}`);
    console.log(`   Pubkey: ${existingPubkey}`);

    if (existingPubkey === PROGRAM_ID) {
      console.log('   ✅ Pubkey matches program ID! Ready to deploy.\n');
      return;
    } else {
      console.log(`   ⚠️  Pubkey doesn't match program ID!`);
      console.log(`   Expected: ${PROGRAM_ID}`);
      console.log(`   Got:      ${existingPubkey}\n`);
      console.log('Options:');
      console.log('1. Use the existing keypair and update program ID in source code');
      console.log('2. Provide the correct keypair file for this program ID');
      return;
    }
  }

  // Generate new keypair
  console.log('Generating new keypair...');
  const keypair = Keypair.generate();
  const pubkey = keypair.publicKey.toString();

  console.log(`\n📝 Generated Keypair:`);
  console.log(`   Pubkey: ${pubkey}`);
  console.log(`   Secret Key: [hidden]\n`);

  if (pubkey !== PROGRAM_ID) {
    console.log('⚠️  Generated pubkey does NOT match target program ID!');
    console.log(`   Target: ${PROGRAM_ID}`);
    console.log(`   Generated: ${pubkey}\n`);
    console.log('You have two options:');
    console.log('\nOption 1: Update program ID in source code');
    console.log(`   Update programs/registry-native/src/lib.rs:`);
    console.log(`   solana_program::declare_id!("${pubkey}");\n`);
    console.log('Option 2: Use a specific keypair');
    console.log('   If you have a seed phrase or specific secret key,');
    console.log('   you can derive the keypair from it.\n');
  }

  // Save keypair
  const keypairDir = path.dirname(KEYPAIR_PATH);
  if (!fs.existsSync(keypairDir)) {
    fs.mkdirSync(keypairDir, { recursive: true });
  }

  const secretKey = Array.from(keypair.secretKey);
  fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(secretKey, null, 2));

  console.log(`✅ Keypair saved to: ${KEYPAIR_PATH}\n`);

  if (pubkey === PROGRAM_ID) {
    console.log('🎉 Perfect match! Ready to deploy.\n');
  } else {
    console.log('⚠️  Remember to update program ID in source code if using this keypair.\n');
  }
}

/**
 * Load keypair from file or environment variable
 */
export function loadKeypair(filePath?: string): Keypair {
  const path = filePath || KEYPAIR_PATH;
  
  if (!fs.existsSync(path)) {
    throw new Error(`Keypair file not found at: ${path}`);
  }

  const secretKey = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

/**
 * Create keypair from secret key array
 */
export function createKeypairFromSecret(secretKey: number[]): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('generate-keypair')) {
  generateKeypair().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { generateKeypair, KEYPAIR_PATH, PROGRAM_ID };


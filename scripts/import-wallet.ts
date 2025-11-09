import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const WALLET_ADDRESS = 'iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u';
const WALLET_KEYPAIR_PATH = path.join(process.cwd(), 'wallet-keypair.json');

/**
 * Import wallet from MetaMask private key
 */
async function importWallet() {
  console.log('🔑 Import MetaMask Solana Wallet\n');
  console.log(`Target Wallet Address: ${WALLET_ADDRESS}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log('How do you want to import your wallet?');
    console.log('1. Private Key (hex string)');
    console.log('2. Private Key (base58 encoded)');
    console.log('3. Seed Phrase (12 or 24 words)');
    console.log('4. Skip (use existing keypair file)\n');

    const choice = await question('Enter choice (1-4): ');

    let keypair: Keypair;

    switch (choice.trim()) {
      case '1': {
        // Private key as hex
        const privateKeyHex = await question('\nEnter private key (hex, 128 chars): ');
        const privateKeyBytes = Buffer.from(privateKeyHex.replace(/^0x/, ''), 'hex');
        
        if (privateKeyBytes.length !== 64) {
          throw new Error('Invalid private key length. Should be 64 bytes (128 hex chars)');
        }

        keypair = Keypair.fromSecretKey(privateKeyBytes);
        break;
      }

      case '2': {
        // Private key as base58
        const privateKeyBase58 = await question('\nEnter private key (base58): ');
        const { default: bs58 } = await import('bs58');
        const privateKeyBytes = bs58.decode(privateKeyBase58);
        
        if (privateKeyBytes.length !== 64) {
          throw new Error('Invalid private key length');
        }

        keypair = Keypair.fromSecretKey(privateKeyBytes);
        break;
      }

      case '3': {
        // Seed phrase
        console.log('\nEnter your seed phrase (12 or 24 words, space-separated):');
        const seedPhrase = await question('> ');
        
        // Note: This requires bip39 library
        // For now, we'll show instructions
        console.log('\n⚠️  Seed phrase import requires additional setup.');
        console.log('Please use the private key method instead, or install:');
        console.log('  npm install bip39 @scure/bip32 ed25519-hd-key');
        throw new Error('Seed phrase import not yet implemented. Use private key method.');
      }

      case '4': {
        // Use existing file
        if (fs.existsSync(WALLET_KEYPAIR_PATH)) {
          const secretKey = JSON.parse(fs.readFileSync(WALLET_KEYPAIR_PATH, 'utf-8'));
          keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
          console.log('\n✅ Using existing keypair file');
        } else {
          throw new Error('No existing keypair file found');
        }
        break;
      }

      default:
        throw new Error('Invalid choice');
    }

    const pubkey = keypair.publicKey.toString();
    console.log(`\n📝 Wallet Details:`);
    console.log(`   Pubkey: ${pubkey}`);

    if (pubkey === WALLET_ADDRESS) {
      console.log('   ✅ Pubkey matches target address!\n');
    } else {
      console.log(`   ⚠️  Pubkey doesn't match target address!`);
      console.log(`   Target: ${WALLET_ADDRESS}`);
      console.log(`   Got:    ${pubkey}\n`);
      console.log('This might be a different wallet. Continue anyway? (y/n)');
      const confirm = await question('> ');
      if (confirm.toLowerCase() !== 'y') {
        throw new Error('Aborted by user');
      }
    }

    // Save keypair
    const secretKey = Array.from(keypair.secretKey);
    fs.writeFileSync(WALLET_KEYPAIR_PATH, JSON.stringify(secretKey, null, 2));

    console.log(`\n✅ Wallet keypair saved to: ${WALLET_KEYPAIR_PATH}`);
    console.log('⚠️  Keep this file secure! Never commit it to git.\n');

    // Generate program ID keypair
    console.log('🔑 Generating program ID keypair...');
    const programKeypair = Keypair.generate();
    const programPubkey = programKeypair.publicKey.toString();
    
    const programKeypairPath = path.join(process.cwd(), 'target/deploy/poi_registry_native-keypair.json');
    const programDir = path.dirname(programKeypairPath);
    if (!fs.existsSync(programDir)) {
      fs.mkdirSync(programDir, { recursive: true });
    }

    const programSecretKey = Array.from(programKeypair.secretKey);
    fs.writeFileSync(programKeypairPath, JSON.stringify(programSecretKey, null, 2));

    console.log(`   Program ID: ${programPubkey}`);
    console.log(`   Saved to: ${programKeypairPath}\n`);

    console.log('📝 Next Steps:');
    console.log(`1. Update program ID in programs/registry-native/src/lib.rs:`);
    console.log(`   solana_program::declare_id!("${programPubkey}");`);
    console.log(`2. Update REGISTRY_PROGRAM_ID in tests/clients/registry-client.ts`);
    console.log(`3. Your wallet (${pubkey}) will be used as upgrade authority\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('import-wallet')) {
  importWallet();
}

export { importWallet, WALLET_KEYPAIR_PATH };


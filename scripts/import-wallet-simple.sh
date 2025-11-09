#!/bin/bash
# Simple script to import MetaMask wallet and generate program keypair

WALLET_ADDRESS="iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u"
WALLET_KEYPAIR="wallet-keypair.json"
PROGRAM_KEYPAIR="target/deploy/poi_registry_native-keypair.json"

echo "🔑 MetaMask Wallet Import Helper"
echo "Wallet Address: $WALLET_ADDRESS"
echo ""

# Check if Solana CLI is available
if ! command -v solana-keygen &> /dev/null; then
    echo "⚠️  Solana CLI not found. Using TypeScript method..."
    echo "Run: npm run import:wallet"
    exit 0
fi

echo "Option 1: Import from existing keypair file"
echo "  If you have a keypair file, place it at: $WALLET_KEYPAIR"
echo ""
echo "Option 2: Generate program keypair (separate from your wallet)"
echo "  This will create a new program ID keypair"
echo ""

read -p "Generate program keypair now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mkdir -p target/deploy
    solana-keygen new \
        --outfile "$PROGRAM_KEYPAIR" \
        --no-bip39-passphrase \
        --force 2>&1
    
    PROGRAM_PUBKEY=$(solana-keygen pubkey "$PROGRAM_KEYPAIR")
    
    echo ""
    echo "✅ Program keypair generated!"
    echo "   Program ID: $PROGRAM_PUBKEY"
    echo ""
    echo "📝 Update these files:"
    echo "   1. programs/registry-native/src/lib.rs"
    echo "      solana_program::declare_id!(\"$PROGRAM_PUBKEY\");"
    echo ""
    echo "   2. tests/clients/registry-client.ts"
    echo "      export const REGISTRY_PROGRAM_ID = new PublicKey('$PROGRAM_PUBKEY');"
    echo ""
    echo "Your wallet ($WALLET_ADDRESS) will be used as upgrade authority when deploying."
fi


#!/bin/bash
# Quick setup script - generates program keypair and shows wallet import steps

set -e

echo "🚀 PoI Protocol Quick Setup"
echo ""

# Check for Solana CLI
if ! command -v solana &> /dev/null; then
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found"
    echo "Install with: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

echo "✅ Solana CLI found"
solana --version
echo ""

# Configure for testnet
echo "📡 Configuring for testnet..."
solana config set --url https://api.testnet.solana.com

# Generate program keypair
echo "🔑 Generating program ID keypair..."
mkdir -p target/deploy
solana-keygen new \
    --outfile target/deploy/poi_registry_native-keypair.json \
    --no-bip39-passphrase \
    --force 2>&1 | grep -v "Wrote" || true

PROGRAM_ID=$(solana-keygen pubkey target/deploy/poi_registry_native-keypair.json)

echo "✅ Program keypair generated"
echo "   Program ID: $PROGRAM_ID"
echo ""

# Update program ID in source
echo "📝 Updating program ID in source code..."
cd programs/registry-native
sed -i "s/solana_program::declare_id!(\".*\");/solana_program::declare_id!(\"$PROGRAM_ID\");/" src/lib.rs
cd ../..

# Update TypeScript client
echo "📝 Updating TypeScript client..."
sed -i "s/export const REGISTRY_PROGRAM_ID = new PublicKey('.*');/export const REGISTRY_PROGRAM_ID = new PublicKey('$PROGRAM_ID');/" tests/clients/registry-client.ts

echo "✅ Source code updated"
echo ""

# Check for wallet keypair
WALLET_ADDRESS="iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u"

if [ -f "wallet-keypair.json" ]; then
    WALLET_PUBKEY=$(solana-keygen pubkey wallet-keypair.json 2>/dev/null || echo "")
    echo "✅ Wallet keypair found"
    echo "   Wallet: $WALLET_PUBKEY"
    if [ "$WALLET_PUBKEY" == "$WALLET_ADDRESS" ]; then
        echo "   ✅ Matches your MetaMask address!"
    else
        echo "   ⚠️  Doesn't match target address ($WALLET_ADDRESS)"
    fi
else
    echo "⚠️  Wallet keypair not found"
    echo ""
    echo "To import your MetaMask wallet:"
    echo "  1. Get your private key from MetaMask"
    echo "  2. Run: npm run import:wallet"
    echo "  OR create wallet-keypair.json manually"
fi

echo ""
echo "📋 Next Steps:"
echo "  1. Import your wallet: npm run import:wallet"
echo "  2. Get testnet SOL: solana airdrop 2"
echo "  3. Deploy: npm run deploy:testnet"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Ready to deploy!"


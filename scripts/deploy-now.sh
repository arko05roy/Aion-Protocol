#!/bin/bash
set -e

# Deployment script for Solana Testnet
# Program ID: iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u

PROGRAM_ID="iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u"
PROGRAM_NAME="poi_registry_native"
PROGRAM_DIR="programs/registry-native"
KEYPAIR_FILE="target/deploy/${PROGRAM_NAME}-keypair.json"
SO_FILE="${PROGRAM_DIR}/target/deploy/${PROGRAM_NAME}.so"

echo "🚀 Deploying PoI Registry to Solana Testnet"
echo "Program ID: $PROGRAM_ID"
echo ""

# Check Solana CLI
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found!"
    echo "Install with: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    echo "Then add to PATH: export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\""
    exit 1
fi

# Configure testnet
echo "📡 Configuring for testnet..."
solana config set --url https://api.testnet.solana.com

# Check balance
echo "💰 Checking balance..."
BALANCE=$(solana balance --output json 2>/dev/null | grep -o '"lamports":[0-9]*' | cut -d: -f2 || echo "0")
BALANCE_SOL=$((BALANCE / 1000000000))

if [ "$BALANCE_SOL" -lt "1" ]; then
    echo "⚠️  Low balance ($BALANCE_SOL SOL). Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Check for keypair
if [ ! -f "$KEYPAIR_FILE" ]; then
    echo "⚠️  Keypair file not found at $KEYPAIR_FILE"
    echo "You need the keypair that corresponds to program ID: $PROGRAM_ID"
    echo ""
    echo "If you have the keypair, place it at: $KEYPAIR_FILE"
    echo "Or generate a new one (but then update program ID in source):"
    echo "  solana-keygen new --outfile $KEYPAIR_FILE"
    exit 1
fi

# Verify keypair matches program ID
KEYPAIR_PUBKEY=$(solana-keygen pubkey "$KEYPAIR_FILE" 2>/dev/null || echo "")
if [ "$KEYPAIR_PUBKEY" != "$PROGRAM_ID" ]; then
    echo "⚠️  Keypair pubkey ($KEYPAIR_PUBKEY) doesn't match program ID ($PROGRAM_ID)"
    echo "Using provided keypair anyway..."
fi

# Build program
echo "🔨 Building program..."
cd "$PROGRAM_DIR"
if ! cargo build-sbf 2>&1; then
    echo "❌ Build failed!"
    exit 1
fi
cd ../..

# Check if .so file exists
if [ ! -f "$SO_FILE" ]; then
    echo "❌ Program .so file not found at $SO_FILE"
    exit 1
fi

# Deploy
echo "🚀 Deploying to testnet..."
solana program deploy \
    --program-id "$KEYPAIR_FILE" \
    "$SO_FILE" \
    --url https://api.testnet.solana.com

# Verify
echo ""
echo "✅ Verifying deployment..."
sleep 3
solana program show "$PROGRAM_ID" --url https://api.testnet.solana.com

echo ""
echo "🎉 Deployment complete!"
echo "Program ID: $PROGRAM_ID"
echo "Network: https://api.testnet.solana.com"


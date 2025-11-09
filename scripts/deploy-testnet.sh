#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

UPGRADE_AUTHORITY="iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u"  # Your MetaMask wallet
PROGRAM_NAME="poi_registry_native"
PROGRAM_DIR="programs/registry-native"
PROGRAM_KEYPAIR_FILE="target/deploy/${PROGRAM_NAME}-keypair.json"
WALLET_KEYPAIR_FILE="wallet-keypair.json"

echo -e "${GREEN}🚀 Deploying PoI Registry Program to Solana Testnet${NC}"
echo -e "Upgrade Authority (Your Wallet): ${YELLOW}${UPGRADE_AUTHORITY}${NC}\n"

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install it first:${NC}"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check if cargo-build-sbf is available
if ! command -v cargo-build-sbf &> /dev/null; then
    echo -e "${YELLOW}⚠️  cargo-build-sbf not found. Installing...${NC}"
    cargo install cargo-build-sbf
fi

# Set testnet
echo -e "${GREEN}📡 Configuring for testnet...${NC}"
solana config set --url https://api.testnet.solana.com

# Check balance
echo -e "${GREEN}💰 Checking balance...${NC}"
BALANCE=$(solana balance --output json | jq -r '.balance // 0')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Low balance. Requesting airdrop...${NC}"
    solana airdrop 2
    sleep 5
fi

# Check for wallet keypair (upgrade authority)
if [ ! -f "$WALLET_KEYPAIR_FILE" ]; then
    echo -e "${YELLOW}⚠️  Wallet keypair not found at $WALLET_KEYPAIR_FILE${NC}"
    echo -e "${YELLOW}   Run: npm run import:wallet${NC}"
    echo -e "${YELLOW}   Or place your MetaMask wallet keypair file there${NC}"
    exit 1
fi

WALLET_PUBKEY=$(solana-keygen pubkey "$WALLET_KEYPAIR_FILE" 2>/dev/null || echo "")
if [ "$WALLET_PUBKEY" != "$UPGRADE_AUTHORITY" ]; then
    echo -e "${YELLOW}⚠️  Wallet pubkey ($WALLET_PUBKEY) doesn't match upgrade authority ($UPGRADE_AUTHORITY)${NC}"
    echo -e "${YELLOW}   Continuing anyway...${NC}"
fi

# Generate program keypair if it doesn't exist
if [ ! -f "$PROGRAM_KEYPAIR_FILE" ]; then
    echo -e "${GREEN}🔑 Generating program ID keypair...${NC}"
    mkdir -p target/deploy
    solana-keygen new --outfile "$PROGRAM_KEYPAIR_FILE" --no-bip39-passphrase --force
    GENERATED_PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR_FILE")
    
    echo -e "${GREEN}📝 Updating program ID in source code...${NC}"
    cd "$PROGRAM_DIR"
    sed -i "s/solana_program::declare_id!(\".*\");/solana_program::declare_id!(\"$GENERATED_PROGRAM_ID\");/" src/lib.rs
    cd ../..
    
    echo -e "${GREEN}✅ Program ID set to: ${GENERATED_PROGRAM_ID}${NC}\n"
else
    # Get existing program ID
    EXISTING_PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR_FILE" 2>/dev/null || echo "")
    echo -e "${GREEN}📝 Using existing program ID: ${EXISTING_PROGRAM_ID}${NC}"
    cd "$PROGRAM_DIR"
    sed -i "s/solana_program::declare_id!(\".*\");/solana_program::declare_id!(\"$EXISTING_PROGRAM_ID\");/" src/lib.rs
    cd ../..
fi

# Build the program
echo -e "${GREEN}🔨 Building program...${NC}"
cargo build-sbf

# Check if build was successful
if [ ! -f "target/deploy/${PROGRAM_NAME}.so" ]; then
    echo -e "${RED}❌ Build failed. Program .so file not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Get program ID
PROGRAM_ID=$(solana-keygen pubkey "$PROGRAM_KEYPAIR_FILE")

# Deploy with upgrade authority
echo -e "${GREEN}🚀 Deploying to testnet...${NC}"
echo -e "Program ID: ${YELLOW}${PROGRAM_ID}${NC}"
echo -e "Upgrade Authority: ${YELLOW}${UPGRADE_AUTHORITY}${NC}\n"

cd ../..
solana program deploy \
    --program-id "$PROGRAM_KEYPAIR_FILE" \
    --upgrade-authority "$WALLET_KEYPAIR_FILE" \
    "$PROGRAM_DIR/target/deploy/${PROGRAM_NAME}.so" \
    --url https://api.testnet.solana.com

# Verify deployment
echo ""
echo -e "${GREEN}✅ Verifying deployment...${NC}"
sleep 3
solana program show "$PROGRAM_ID" --url https://api.testnet.solana.com

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "Program ID: ${GREEN}${PROGRAM_ID}${NC}"
echo -e "Upgrade Authority: ${GREEN}${UPGRADE_AUTHORITY}${NC}"
echo -e "Network: https://api.testnet.solana.com"


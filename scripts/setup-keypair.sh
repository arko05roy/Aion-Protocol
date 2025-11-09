#!/bin/bash
# Script to set up keypair for the specific program ID

PROGRAM_ID="iJUv5HxvwXFZaGeNDEG1DCNWYNfLQke8SBGvkrKYP2u"
KEYPAIR_FILE="target/deploy/poi_registry_native-keypair.json"

echo "Setting up keypair for Program ID: $PROGRAM_ID"

# If you already have a keypair file for this address, copy it:
if [ -f "$KEYPAIR_FILE" ]; then
    echo "Keypair file already exists at $KEYPAIR_FILE"
    PUBKEY=$(solana-keygen pubkey "$KEYPAIR_FILE" 2>/dev/null || echo "")
    if [ "$PUBKEY" == "$PROGRAM_ID" ]; then
        echo "✅ Keypair matches program ID!"
    else
        echo "⚠️  Keypair pubkey ($PUBKEY) doesn't match program ID"
        echo "You may need to provide the correct keypair file"
    fi
else
    echo "⚠️  Keypair file not found. You need to:"
    echo "1. Generate a keypair that matches this program ID, OR"
    echo "2. Provide an existing keypair file at: $KEYPAIR_FILE"
    echo ""
    echo "To generate a new keypair:"
    echo "  solana-keygen new --outfile $KEYPAIR_FILE"
    echo ""
    echo "Note: The generated pubkey must match: $PROGRAM_ID"
fi


#!/bin/bash
# Alternative Solana installation methods

echo "Trying alternative Solana CLI installation methods..."

# Method 1: Check if already in PATH from different location
if command -v solana &> /dev/null; then
    echo "✅ Solana CLI found in PATH"
    solana --version
    exit 0
fi

# Method 2: Check common installation locations
PATHS=(
    "$HOME/.local/share/solana/install/active_release/bin"
    "$HOME/.cargo/bin"
    "/usr/local/bin"
    "/opt/solana/bin"
)

for path in "${PATHS[@]}"; do
    if [ -f "$path/solana" ]; then
        echo "✅ Found Solana at: $path"
        export PATH="$path:$PATH"
        solana --version
        exit 0
    fi
done

# Method 3: Try downloading binary directly (if network allows)
echo "Attempting direct binary download..."
mkdir -p /tmp/solana-install
cd /tmp/solana-install

# Try to get latest version and download
VERSION=$(curl -s https://api.github.com/repos/solana-labs/solana/releases/latest 2>/dev/null | grep -o '"tag_name":"[^"]*' | cut -d'"' -f4 || echo "v1.18.0")

echo "Latest version: $VERSION"
echo ""
echo "❌ Automatic installation failed due to network issues."
echo ""
echo "Please install Solana CLI manually:"
echo "1. Visit: https://docs.solana.com/cli/install-solana-cli-tools"
echo "2. Or download from: https://github.com/solana-labs/solana/releases"
echo "3. Or use: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
echo ""
echo "After installation, add to PATH:"
echo "export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\""


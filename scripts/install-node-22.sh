#!/usr/bin/env bash
# Install Node.js 22 LTS via nvm, then install this site's dependencies.
# Astro 6 requires Node >= 22.12.0.
#
# Usage (from the repo root):
#   bash scripts/install-node.sh
#
# Afterwards, open a new terminal (or run `source ~/.zshrc`) and start the
# dev server with `npm run dev`.

set -euo pipefail

NVM_VERSION="v0.40.3"
NODE_VERSION="22"

# 1. Install nvm if it is not already present.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "==> Installing nvm $NVM_VERSION"
  # PROFILE makes the installer add nvm's init lines to ~/.zshrc (macOS default shell).
  touch "$HOME/.zshrc"
  curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh" \
    | PROFILE="$HOME/.zshrc" bash
else
  echo "==> nvm already installed"
fi

# 2. Load nvm into this shell.
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

# 3. Install Node 22 LTS and make it the default.
echo "==> Installing Node $NODE_VERSION LTS"
nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
nvm use default

echo "==> node $(node --version), npm $(npm --version)"

# 4. Install the site's dependencies.
cd "$(dirname "$0")/.."
echo "==> Installing npm dependencies"
npm install

echo
echo "Done. Open a new terminal (or run: source ~/.zshrc), then run:"
echo "  npm run dev"

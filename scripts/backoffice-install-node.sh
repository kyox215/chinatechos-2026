#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NODE_VERSION="v22.13.1"
ARCH="darwin-arm64"
URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${ARCH}.tar.gz"

mkdir -p "$ROOT_DIR/.tooling"
cd "$ROOT_DIR/.tooling"

rm -rf node node.tar.gz
curl -fsSL -o node.tar.gz "$URL"
tar -xzf node.tar.gz
mv "node-${NODE_VERSION}-${ARCH}" node
rm -f node.tar.gz

export PATH="$ROOT_DIR/.tooling/node/bin:$PATH"

node -v
npm -v

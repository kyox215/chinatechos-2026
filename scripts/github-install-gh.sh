#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GH_VERSION="2.92.0"
URL="https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_macOS_arm64.zip"

mkdir -p "$ROOT_DIR/.tooling"
cd "$ROOT_DIR/.tooling"

rm -rf gh gh.zip gh_${GH_VERSION}_macOS_arm64
curl -fsSL -o gh.zip "$URL"
unzip -q gh.zip
mv "gh_${GH_VERSION}_macOS_arm64" gh
rm -f gh.zip

export PATH="$ROOT_DIR/.tooling/gh/bin:$PATH"
gh --version

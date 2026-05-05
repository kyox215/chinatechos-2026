#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$ROOT_DIR/.tooling/gh/bin:$PATH"

gh auth login --hostname github.com --web --git-protocol https
gh auth status --hostname github.com

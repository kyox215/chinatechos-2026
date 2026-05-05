#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$ROOT_DIR/.tooling/node/bin:$PATH"

cd "$ROOT_DIR/apps/backoffice"

npm run dev -- -p 3100

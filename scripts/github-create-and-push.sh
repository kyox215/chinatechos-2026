#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$ROOT_DIR/.tooling/gh/bin:$PATH"

cd "$ROOT_DIR"

gh auth status --hostname github.com

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
  git branch -M main
fi

git add .
if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "chore: bootstrap project"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create ChinaTechOS --public --source=. --remote=origin --push
else
  git push -u origin main
fi

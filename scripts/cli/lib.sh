#!/usr/bin/env bash
# Shared helpers for spec-tree CLI workflow scripts.
# Source this file from every script in scripts/cli/.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/output}"
PROMPTS_DIR="${PROMPTS_DIR:-$ROOT_DIR/prompts}"
INPUT_DIR="${INPUT_DIR:-$ROOT_DIR/input}"
API="${API:-http://127.0.0.1:3001}"

log()  { printf '[cli] %s\n' "$*" >&2; }
die()  { printf '[cli] error: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

ensure_output_dir() {
  mkdir -p "$OUTPUT_DIR"
}

# atomic_write <dest> — read stdin into <dest>.tmp then rename.
atomic_write() {
  local dest="$1"
  local tmp="$dest.tmp"
  cat > "$tmp"
  mv "$tmp" "$dest"
}

# Note: fence stripping and meta.generated_at injection now live in
# @spec-tree/ai (packages/ai/src/postprocess.ts) and are applied automatically
# by run-prompt.sh.

# api_health — probe the backend; print a friendly hint on failure.
api_health() {
  if ! curl -fsS "$API/api/health" -o /dev/null; then
    die "backend unreachable at $API. Start it with: npm run dev -w packages/backend"
  fi
}

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

# strip_fence — strip a leading UTF-8 BOM, surrounding whitespace, and a
# wrapping ```json ... ``` (or ``` ... ```) fence pair from stdin.
strip_fence() {
  awk '
    BEGIN { started = 0 }
    {
      if (NR == 1) sub(/^\xef\xbb\xbf/, "", $0)
      if (!started) {
        if ($0 ~ /^[[:space:]]*$/) next
        if ($0 ~ /^[[:space:]]*```([[:alnum:]]+)?[[:space:]]*$/) { started = 1; next }
        started = 1
      }
      print
    }
  ' | awk '
    { lines[NR] = $0 }
    END {
      end = NR
      while (end > 0 && lines[end] ~ /^[[:space:]]*$/) end--
      if (end > 0 && lines[end] ~ /^[[:space:]]*```[[:space:]]*$/) end--
      for (i = 1; i <= end; i++) print lines[i]
    }
  '
}

# ensure_iso_timestamp — read a JSON object on stdin, write it back to stdout
# with .meta.generated_at populated (ISO 8601, UTC, ms-precision) if missing or
# not a valid ISO string.
ensure_iso_timestamp() {
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  jq --arg now "$now" '
    .meta = (.meta // {}) |
    .meta.generated_at =
      ( if (.meta.generated_at | type) == "string"
          and (.meta.generated_at | test("^\\d{4}-\\d{2}-\\d{2}T"))
        then .meta.generated_at
        else $now
        end )
  '
}

# api_health — probe the backend; print a friendly hint on failure.
api_health() {
  if ! curl -fsS "$API/api/health" -o /dev/null; then
    die "backend unreachable at $API. Start it with: npm run dev -w packages/backend"
  fi
}

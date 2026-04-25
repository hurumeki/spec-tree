#!/usr/bin/env bash
# Run a CLI prompt template through the configured AI provider.
#
# Usage: run-prompt.sh <prompt-template.md> <output.json>
# Stdin: payload to append after the prompt template.
#
# Concatenates the prompt template + payload and pipes it into spec-tree-ai
# (packages/ai). The provider is selected by AI_PROVIDER (or ai.config.json),
# defaulting to "claude-code". JSON post-processing (fence/BOM stripping, ISO
# timestamp injection, atomic write) is performed by spec-tree-ai itself.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

prompt="${1:?prompt template path required}"
out="${2:?output path required}"

[[ -f "$prompt" ]] || die "prompt template not found: $prompt"
require_cmd node

ensure_output_dir
mkdir -p "$(dirname "$out")"

ai_cli="$ROOT_DIR/packages/ai/dist/cli.js"
if [[ ! -f "$ai_cli" ]]; then
  log "building @spec-tree/ai (one-time)"
  (cd "$ROOT_DIR" && npm run build --workspace packages/ai >/dev/null)
fi

log "running ai provider with prompt: $prompt → $out"

{
  cat "$prompt"
  printf '\n\n---\n\n'
  cat
} | node "$ai_cli" run --out "$out"

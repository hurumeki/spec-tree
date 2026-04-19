#!/usr/bin/env bash
# Run a CLI prompt template through the Claude Code CLI.
#
# Usage: run-claude.sh <prompt-template.md> <output.json>
# Stdin: payload to append after the prompt template.
#
# Concatenates the prompt template + payload, pipes the combined input to
# `claude -p`, defensively strips a leading BOM and any wrapping ```json fence,
# validates the result with `jq empty`, and atomically writes the JSON to the
# output path. On validation failure the raw output is preserved at <output>.raw.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

prompt="${1:?prompt template path required}"
out="${2:?output path required}"

[[ -f "$prompt" ]] || die "prompt template not found: $prompt"
require_cmd claude
require_cmd jq

ensure_output_dir
mkdir -p "$(dirname "$out")"

raw="$out.raw"
trap 'rm -f "$out.tmp"' EXIT

log "running claude with prompt: $prompt → $out"

{
  cat "$prompt"
  printf '\n\n---\n\n'
  cat
} | claude -p > "$raw"

if ! strip_fence < "$raw" | jq empty 2>/dev/null; then
  die "claude output is not valid JSON. Raw output preserved at: $raw"
fi

strip_fence < "$raw" | ensure_iso_timestamp > "$out.tmp"
mv "$out.tmp" "$out"
rm -f "$raw"
trap - EXIT

log "wrote $out"

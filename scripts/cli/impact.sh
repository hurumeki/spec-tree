#!/usr/bin/env bash
# Run impact analysis for a specification-change document.
#
# Usage: impact.sh <change.md>
#
# Implements step 2 of docs/05-cli-workflow.md §5.2. Requires
# output/db_snapshot.json (run `make snapshot` first or rely on the Makefile
# dependency).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

doc="${1:?DOC required (usage: impact.sh <change.md>)}"
[[ -f "$doc" ]] || die "change document not found: $doc"

snapshot="$OUTPUT_DIR/db_snapshot.json"
[[ -f "$snapshot" ]] || die "missing $snapshot (run \`make snapshot\` first)"

out="$OUTPUT_DIR/impact_result.json"
source_file="$(basename "$doc")"

{
  printf '## 入力\n\n'
  printf 'change_document: %s\n\n' "$source_file"
  printf '===== 変更ドキュメント (%s) =====\n\n' "$source_file"
  cat "$doc"
  printf '\n\n===== db_snapshot.json =====\n\n'
  cat "$snapshot"
} | bash "$SCRIPT_DIR/run-prompt.sh" "$PROMPTS_DIR/impact.md" "$out"

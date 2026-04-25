#!/usr/bin/env bash
# Structured extraction for one input document.
#
# Usage: extract.sh <doc.md> <doc_type> <output.json>
#   doc_type ∈ { requirement | specification | test_case }
#
# Implements step 1–3 of docs/05-cli-workflow.md §5.1.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

doc="${1:?input markdown path required}"
doc_type="${2:?doc_type required (requirement|specification|test_case)}"
out="${3:?output path required}"

[[ -f "$doc" ]] || die "input document not found: $doc"
case "$doc_type" in
  requirement|specification|test_case) ;;
  *) die "invalid doc_type: $doc_type" ;;
esac

source_file="$(basename "$doc")"

{
  printf '## 入力\n\n'
  printf 'source_file: %s\n' "$source_file"
  printf 'doc_type: %s\n\n' "$doc_type"
  printf '本文:\n\n'
  cat "$doc"
} | bash "$SCRIPT_DIR/run-prompt.sh" "$PROMPTS_DIR/extract.md" "$out"

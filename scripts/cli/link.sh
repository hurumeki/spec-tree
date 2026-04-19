#!/usr/bin/env bash
# Infer traceability links over output/all_nodes.json.
# Implements step 5 of docs/05-cli-workflow.md §5.1.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

src="$OUTPUT_DIR/all_nodes.json"
out="$OUTPUT_DIR/link_result.json"

[[ -f "$src" ]] || die "missing $src (run \`make all-nodes\` first)"

cat "$src" | bash "$SCRIPT_DIR/run-claude.sh" "$PROMPTS_DIR/link.md" "$out"

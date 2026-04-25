#!/usr/bin/env bash
# Whole-spec quality review over nodes + edges.
# Implements step 6 of docs/05-cli-workflow.md §5.1.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
require_cmd jq

nodes="$OUTPUT_DIR/all_nodes.json"
links="$OUTPUT_DIR/link_result.json"
out="$OUTPUT_DIR/review_result.json"

[[ -f "$nodes" ]] || die "missing $nodes"
[[ -f "$links" ]] || die "missing $links"

jq -s '{ nodes: .[0].nodes, edges: .[1].edges }' "$nodes" "$links" \
  | bash "$SCRIPT_DIR/run-prompt.sh" "$PROMPTS_DIR/review.md" "$out"

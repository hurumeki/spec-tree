#!/usr/bin/env bash
# Merge per-document extract outputs into output/all_nodes.json.
# Implements step 4 of docs/05-cli-workflow.md §5.1.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
require_cmd jq

req="$OUTPUT_DIR/extract_req.json"
spec="$OUTPUT_DIR/extract_spec.json"
tc="$OUTPUT_DIR/extract_tc.json"
out="$OUTPUT_DIR/all_nodes.json"

for f in "$req" "$spec" "$tc"; do
  [[ -f "$f" ]] || die "missing extract output: $f (run \`make extract-req extract-spec extract-tc\` first)"
done

ensure_output_dir
jq -s '{ nodes: (map(.nodes) | add) }' "$req" "$spec" "$tc" > "$out.tmp"
mv "$out.tmp" "$out"
log "wrote $out"

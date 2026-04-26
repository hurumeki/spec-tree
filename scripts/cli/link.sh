#!/usr/bin/env bash
# Infer traceability links over output/all_nodes.json.
# Implements step 5 of docs/05-cli-workflow.md §5.1.
#
# Per docs/04-ai-processing.md §4.3.1 and docs/08-operations.md §8.4, when the
# node count exceeds the threshold (default 50) the input is split by
# requirement and link.md is invoked once per batch; results are then merged
# (edges deduped on (source_id, target_id, relation_type), reviews concatenated).
#
# Tunables:
#   SPEC_TREE_LINK_BATCH_THRESHOLD  node-count threshold to trigger batching (default 50)
#   SPEC_TREE_LINK_BATCH_SIZE       requirements per batch (default = threshold)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
require_cmd jq

src="$OUTPUT_DIR/all_nodes.json"
out="$OUTPUT_DIR/link_result.json"
threshold="${SPEC_TREE_LINK_BATCH_THRESHOLD:-50}"
batch_size="${SPEC_TREE_LINK_BATCH_SIZE:-$threshold}"

[[ -f "$src" ]] || die "missing $src (run \`make all-nodes\` first)"

total=$(jq '.nodes | length' "$src")

if (( total <= threshold )); then
  log "node count $total ≤ $threshold; running link.md once"
  cat "$src" | bash "$SCRIPT_DIR/run-prompt.sh" "$PROMPTS_DIR/link.md" "$out"
  exit 0
fi

batch_dir="$OUTPUT_DIR/.link-batches"
rm -rf "$batch_dir"
mkdir -p "$batch_dir"

log "node count $total > $threshold; batching by requirement (size=$batch_size)"

# Each batch carries a slice of requirements plus the full SPEC + TC context,
# so the AI can infer realizes / verifies / depends_on edges for that slice.
# SPEC-SPEC depends_on edges are emitted in every batch; the merge step dedupes.
jq --argjson size "$batch_size" '
  (.nodes | map(select(.type == "requirement")))   as $reqs  |
  (.nodes | map(select(.type == "specification"))) as $specs |
  (.nodes | map(select(.type == "test_case")))     as $tcs   |
  [
    range(0; ($reqs | length); $size) as $i |
    { nodes: ($reqs[$i:$i+$size] + $specs + $tcs) }
  ]
' "$src" > "$batch_dir/chunks.json"

batch_count=$(jq 'length' "$batch_dir/chunks.json")
log "produced $batch_count batch(es)"

for (( i=0; i<batch_count; i++ )); do
  chunk_file="$batch_dir/chunk_$i.json"
  result_file="$batch_dir/result_$i.json"
  jq ".[$i]" "$batch_dir/chunks.json" > "$chunk_file"
  log "batch $((i+1))/$batch_count → $result_file"
  bash "$SCRIPT_DIR/run-prompt.sh" "$PROMPTS_DIR/link.md" "$result_file" < "$chunk_file"
done

# Merge: keep highest-confidence representative for each (src,tgt,rel) tuple,
# concat reviews, restamp meta with the full node count.
jq -s --argjson nc "$total" '
  {
    meta: { type: "link", node_count: $nc, generated_at: (now | todateiso8601) },
    edges: (
      (map(.edges // []) | add)
      | group_by("\(.source_id)|\(.target_id)|\(.relation_type)")
      | map(max_by(.confidence))
    ),
    reviews: (map(.reviews // []) | add)
  }
' "$batch_dir"/result_*.json > "$out.tmp"
mv "$out.tmp" "$out"
log "merged $batch_count batch results into $out"

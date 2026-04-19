#!/usr/bin/env bash
# Aggregate all CLI outputs into output/bundle.json (importable via /api/import).
# Implements step 7 of docs/05-cli-workflow.md §5.1.
#
# Schema: docs/03-json-formats.md §3.4 (BundleSchema in
# packages/backend/src/schemas/cli-json.ts).
#
# - Edges pass through verbatim from link_result (preserve confidence + reasoning).
# - Reviews from extract×3 + link + review are concatenated then deduped on
#   (severity, category, message, node_id, edge_id).
# - review_result.json is folded in here ONLY; it must NOT be POSTed standalone
#   because its meta.type="review" is not part of ImportPayloadSchema.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
require_cmd jq

req="$OUTPUT_DIR/extract_req.json"
spec="$OUTPUT_DIR/extract_spec.json"
tc="$OUTPUT_DIR/extract_tc.json"
links="$OUTPUT_DIR/link_result.json"
review="$OUTPUT_DIR/review_result.json"
out="$OUTPUT_DIR/bundle.json"

for f in "$req" "$spec" "$tc" "$links" "$review"; do
  [[ -f "$f" ]] || die "missing input for bundle: $f"
done

generated_at="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

ensure_output_dir
jq -n \
  --arg ts "$generated_at" \
  --slurpfile req "$req" \
  --slurpfile spec "$spec" \
  --slurpfile tc "$tc" \
  --slurpfile link "$links" \
  --slurpfile review "$review" \
  '
  {
    meta: {
      type: "bundle",
      source_files: [
        $req[0].meta.source_file,
        $spec[0].meta.source_file,
        $tc[0].meta.source_file
      ],
      generated_at: $ts
    },
    nodes: ($req[0].nodes + $spec[0].nodes + $tc[0].nodes),
    edges: $link[0].edges,
    reviews: (
      (($req[0].reviews // [])
       + ($spec[0].reviews // [])
       + ($tc[0].reviews // [])
       + ($link[0].reviews // [])
       + ($review[0].reviews // []))
      | unique_by([.severity, .category, .message, (.node_id // ""), (.edge_id // -1)])
    )
  }
  ' > "$out.tmp"
mv "$out.tmp" "$out"
log "wrote $out"

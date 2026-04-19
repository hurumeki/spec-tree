#!/usr/bin/env bash
# Fetch the current DB snapshot from the running backend.
# Implements step 1 of docs/05-cli-workflow.md §5.2.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
require_cmd curl
require_cmd jq

out="$OUTPUT_DIR/db_snapshot.json"

ensure_output_dir
api_health
curl -fsS "$API/api/export" -o "$out.tmp"
jq empty < "$out.tmp" || die "snapshot is not valid JSON"
mv "$out.tmp" "$out"
log "wrote $out"

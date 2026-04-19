#!/usr/bin/env bash
# POST a CLI JSON payload to the backend's /api/import.
#
# Usage: import.sh [<json-file>]   (default: output/bundle.json)
#
# Accepts any of: extract_*.json, link_result.json, impact_result.json,
# bundle.json. NOTE: review_result.json is NOT importable on its own — fold it
# into bundle.json via bundle.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
require_cmd curl
require_cmd jq

file="${1:-$OUTPUT_DIR/bundle.json}"
[[ -f "$file" ]] || die "payload not found: $file"

# Reject review_result.json (meta.type="review" is not in ImportPayloadSchema).
meta_type="$(jq -r '.meta.type // ""' < "$file")"
case "$meta_type" in
  extract|link|impact|bundle) ;;
  review) die "review_result.json is not importable; merge it into bundle.json instead" ;;
  *)      die "unknown meta.type=$meta_type — not an importable CLI payload" ;;
esac

api_health
log "POST $API/api/import ($meta_type)"
curl -fsS -X POST "$API/api/import" \
  -H 'Content-Type: application/json' \
  --data-binary @"$file"
printf '\n'

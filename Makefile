# spec-tree CLI workflow — drives the four prompts (extract / link / review /
# impact) and the backend's /api/import + /api/export endpoints.
# See docs/05-cli-workflow.md for the end-to-end pipeline description.

DOCS    ?= ./input
OUTPUT  ?= ./output
PROMPTS ?= ./prompts
API     ?= http://127.0.0.1:3001
DOC     ?=

SCRIPTS := scripts/cli
SHELL   := /usr/bin/env bash

export OUTPUT_DIR := $(OUTPUT)
export PROMPTS_DIR := $(PROMPTS)
export INPUT_DIR := $(DOCS)
export API

.PHONY: help setup health \
        extract-req extract-spec extract-tc \
        all-nodes link review bundle init \
        import snapshot impact import-impact \
        clean

help:
	@echo "spec-tree CLI workflow targets:"
	@echo "  make init   DOCS=./input            # §5.1 steps 1–7 → output/bundle.json"
	@echo "  make import                          # POST output/bundle.json to \$$API/api/import"
	@echo "  make snapshot                        # GET \$$API/api/export → output/db_snapshot.json"
	@echo "  make impact DOC=./input/change.md    # §5.2 → output/impact_result.json"
	@echo "  make import-impact                   # POST output/impact_result.json"
	@echo "  make clean                           # remove output/*.json"
	@echo
	@echo "Variables: DOCS=$(DOCS) OUTPUT=$(OUTPUT) PROMPTS=$(PROMPTS) API=$(API)"

setup:
	@mkdir -p $(OUTPUT)

health:
	@bash -c 'source $(SCRIPTS)/lib.sh && api_health && echo "backend ok at $$API"'

# ----- §5.1 Initial-import flow -----

extract-req: setup
	bash $(SCRIPTS)/extract.sh $(DOCS)/requirements.md   requirement   $(OUTPUT)/extract_req.json

extract-spec: setup
	bash $(SCRIPTS)/extract.sh $(DOCS)/specifications.md specification $(OUTPUT)/extract_spec.json

extract-tc: setup
	bash $(SCRIPTS)/extract.sh $(DOCS)/test_cases.md     test_case     $(OUTPUT)/extract_tc.json

all-nodes: extract-req extract-spec extract-tc
	bash $(SCRIPTS)/merge-nodes.sh

link: all-nodes
	bash $(SCRIPTS)/link.sh

review: link
	bash $(SCRIPTS)/review.sh

bundle: review
	bash $(SCRIPTS)/bundle.sh

init: bundle
	@echo "[cli] initial import bundle ready: $(OUTPUT)/bundle.json"
	@echo "[cli] next: make import"

import: setup
	bash $(SCRIPTS)/import.sh $(OUTPUT)/bundle.json

# ----- §5.2 Specification-change flow -----

snapshot: setup
	bash $(SCRIPTS)/snapshot.sh

$(OUTPUT)/db_snapshot.json: setup
	bash $(SCRIPTS)/snapshot.sh

impact: $(OUTPUT)/db_snapshot.json
	@if [ -z "$(DOC)" ]; then \
	  echo "[cli] error: DOC is required (e.g. make impact DOC=./input/change.md)" >&2; \
	  exit 1; \
	fi
	bash $(SCRIPTS)/impact.sh $(DOC)

import-impact: setup
	bash $(SCRIPTS)/import.sh $(OUTPUT)/impact_result.json

# ----- housekeeping -----

clean:
	rm -f $(OUTPUT)/*.json $(OUTPUT)/*.tmp $(OUTPUT)/*.raw

# @spec-tree/ai

Provider-agnostic AI runner for the `spec-tree` CLI workflow. Routes a fully-rendered prompt to one of four providers and returns validated JSON.

## Providers

| `AI_PROVIDER` | Backend                          | Required env             |
| :------------ | :------------------------------- | :----------------------- |
| `claude-code` | `claude -p` subprocess (default) | `claude` on `PATH`       |
| `anthropic`   | Anthropic Messages API           | `AI_API_KEY`             |
| `openai`      | OpenAI Chat Completions API      | `AI_API_KEY`             |
| `ollama`      | Local Ollama HTTP API            | (`AI_BASE_URL` optional) |

Provider precedence: `--provider` CLI flag > `AI_PROVIDER` env > `ai.config.json` > `claude-code`.

## CLI

```
# stdin = full prompt; result written atomically to --out
spec-tree-ai run --out output/extract_req.json < combined_prompt.txt

# split prompt template + payload
spec-tree-ai run --prompt-file prompts/extract.md \
                 --payload-file output/req_payload.txt \
                 --out output/extract_req.json
```

## Library

```ts
import { loadConfig, runPrompt } from '@spec-tree/ai';

const config = await loadConfig();
const { json } = await runPrompt({ prompt, config });
```

See `src/types.ts` for the `AiProvider` interface; add a new provider by implementing `run({ prompt, signal })` and registering it in `src/providers/index.ts`.

## Output post-processing

Every provider's raw text is run through `stripFence` → `JSON.parse` → `ensureIsoTimestamp` (sets `meta.generated_at` if missing). The CLI then writes atomically.

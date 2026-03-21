# acestep-cpp-api

[ACE-Step 1.5 HTTP API](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md) proxy backed by [acestep.cpp](https://github.com/audiohacking/acestep.cpp) (`ace-lm` + `ace-synth`). Built with **[Bun](https://bun.sh)**.

## ACE-Step-DAW (submodule + same-origin UI)

This repo includes **[ACE-Step-DAW](https://github.com/ace-step/ACE-Step-DAW)** as a **git submodule** at `ACE-Step-DAW/`.

Clone with submodules:

```bash
git clone --recurse-submodules <repo-url>
# or after clone:
git submodule update --init --recursive
```

**Demo (DAW UI + API):** point **`ACESTEP_MODELS_DIR`** at the folder that contains your GGUF files, set the usual model filenames (same as [Models directory](#models-directory-always-via-env) below), bundle binaries once, build the DAW, then start:

```bash
export ACESTEP_MODELS_DIR="$HOME/models/acestep"
export ACESTEP_LM_MODEL=acestep-5Hz-lm-4B-Q8_0.gguf
export ACESTEP_EMBEDDING_MODEL=Qwen3-Embedding-0.6B-Q8_0.gguf
export ACESTEP_DIT_MODEL=acestep-v15-turbo-Q8_0.gguf
export ACESTEP_VAE_MODEL=vae-BF16.gguf
bun run bundle:acestep   # once per machine: fetch ace-lm / ace-synth
bun run daw:build
bun run start
# Open http://127.0.0.1:<port>/  (default port from env / config)
```

Static files are served from `ACE-Step-DAW/dist` unless you override **`ACESTEP_DAW_DIST`**.

The DAW’s production client calls **`/api/...`**. This server accepts the **same routes with or without the `/api` prefix** (e.g. `/api/health` and `/health` both work), so you can use the built UI on the **same origin** without Vite’s dev proxy.

Optional: set backend URL in the DAW to **`http://127.0.0.1:<port>`** (no `/api`) in Settings / `localStorage['ace-step-daw-backend-url']` — then requests go to `/release_task`, `/health`, etc. directly.

| Env | Purpose |
|-----|---------|
| **`ACESTEP_DAW_DIST`** | Absolute path to a Vite `dist/` folder (defaults to `<app-root>/ACE-Step-DAW/dist`) |

**Not supported here:** `task_type: stem_separation` (returns **501** — needs the full Python ACE-Step stack). **`/format_input`** / **`/create_random_sample`** remain stubs for API shape compatibility.

**Building the DAW (no submodule edits):** **`bun run daw:build`** runs **`vite build`** inside **`ACE-Step-DAW/`** only. We intentionally do **not** run the submodule’s **`tsc -b`** step here, so vendored **ACE-Step-DAW** stays a pristine upstream checkout while still producing a usable **`dist/`** for this API server. For the full upstream pipeline (typecheck + Vite), run **`npm run build`** inside the submodule yourself when you need it.

CLI usage matches the upstream [acestep.cpp README](https://github.com/audiohacking/acestep.cpp/blob/master/README.md): **MP3 by default** (128 kbps, overridable), **`--wav`** for stereo 48 kHz WAV, plus optional **`--lora`**, **`--lora-scale`**, **`--vae-chunk`**, **`--vae-overlap`**, **`--mp3-bitrate`**.

## Bundled acestep.cpp binaries (v0.0.3)

`bun run build` downloads the correct asset from **[acestep.cpp releases v0.0.3](https://github.com/audiohacking/acestep.cpp/releases/tag/v0.0.3)** for the **current** OS/arch, installs them under `acestep-runtime/bin/`, compiles `dist/acestep-api`, then copies `acestep-runtime` next to the executable:

```text
dist/
  acestep-api          # or acestep-api.exe
  acestep-runtime/
    bin/
      ace-lm
      ace-synth
```

Run the API **from `dist/`** (or anywhere) — the binary resolves siblings via `dirname(execPath)`:

```bash
cd dist && ./acestep-api
```

Override layout with **`ACESTEP_APP_ROOT`** (directory that should contain `acestep-runtime/`) or **`ACESTEP_BIN_DIR`** (direct path to the folder containing `ace-lm` / `ace-synth`).

- Skip download: `SKIP_ACESTEP_BUNDLE=1 bun run build:binary-only`
- Unsupported host (e.g. **darwin x64** has no v0.0.3 zip): set **`ACESTEP_BIN_DIR`** to your own build or use another machine.

## Models directory (always via env)

GGUF paths can be **absolute**, **relative to the app root** (`./models/...`), or **bare filenames** resolved under a models directory:

| Variable | Purpose |
|----------|---------|
| **`ACESTEP_MODELS_DIR`** | Base directory for default LM / embedding / DiT / VAE **filenames** |
| **`ACESTEP_MODEL_PATH`** | Alias (same as above) |
| **`MODELS_DIR`** | Extra alias |

Example (paths from [Hugging Face ACE-Step-1.5-GGUF](https://huggingface.co/Serveurperso/ACE-Step-1.5-GGUF)):

```bash
export ACESTEP_MODELS_DIR="$HOME/models/acestep"
export ACESTEP_LM_MODEL=acestep-5Hz-lm-4B-Q8_0.gguf
export ACESTEP_EMBEDDING_MODEL=Qwen3-Embedding-0.6B-Q8_0.gguf
export ACESTEP_DIT_MODEL=acestep-v15-turbo-Q8_0.gguf
export ACESTEP_VAE_MODEL=vae-BF16.gguf
```

Per-request `lm_model_path` and **`ACESTEP_MODEL_MAP`** values use the same resolution rules.

## Run (source)

```bash
bun install
bun run bundle:acestep   # once: fetch v0.0.3 binaries for this machine
export ACESTEP_MODELS_DIR="$HOME/models/acestep"
export ACESTEP_LM_MODEL=acestep-5Hz-lm-4B-Q8_0.gguf
export ACESTEP_EMBEDDING_MODEL=Qwen3-Embedding-0.6B-Q8_0.gguf
export ACESTEP_DIT_MODEL=acestep-v15-turbo-Q8_0.gguf
export ACESTEP_VAE_MODEL=vae-BF16.gguf
bun run start
```

Change **`ACESTEP_MODELS_DIR`** to your real models directory; filenames must exist under that path (or use absolute paths in the `ACESTEP_*_MODEL` vars per [Models directory](#models-directory-always-via-env)).

## Build

```bash
bun run build            # bundle + compile + copy runtime → dist/
bun run build:windows    # on Windows x64
bun run build:binary-only # compile only (reuse existing acestep-runtime/)
```

## ace-synth flags (env)

| Variable | Maps to |
|----------|---------|
| `ACESTEP_MP3_BITRATE` | `--mp3-bitrate` (default **128**) when output is MP3 |
| `ACESTEP_LORA` / `ACESTEP_LORA_SCALE` | `--lora` / `--lora-scale` |
| `ACESTEP_VAE_CHUNK` / `ACESTEP_VAE_OVERLAP` | `--vae-chunk` / `--vae-overlap` |

API `audio_format: "wav"` adds **`--wav`** (no `--mp3-bitrate`).

## Reference / source audio (cover, repaint, lego)

Modes that need a reference or source track (**cover**, **repaint**, **lego**) require one of:

- **Upload** (multipart `POST /release_task`):
  - **`reference_audio`** or **`ref_audio`** — file part (MP3, WAV, etc.)
  - **`src_audio`** or **`ctx_audio`** — file part
  - Uploaded files are written under the task job dir and passed to `ace-synth --src-audio`.
- **Path** (JSON or form fields):
  - **`reference_audio_path`** / **`referenceAudioPath`** — server path (absolute or relative to app root)
  - **`src_audio_path`** / **`srcAudioPath`** — server path

If **`task_type`** is `cover`, `repaint`, or `lego` and neither a path nor an uploaded file is provided, the API returns **400** with a message that reference/source audio is required.

Worker uses **`src_audio_path`** when set, otherwise **`reference_audio_path`**; a single `--src-audio` is passed to ace-synth. Request JSON already supports **`audio_cover_strength`**, **`repainting_start`** / **`repainting_end`**, and **`lego`** (track name) per [acestep.cpp README](https://github.com/audiohacking/acestep.cpp/blob/master/README.md).

## API emulation notes

See earlier revisions for full AceStep 1.5 route mapping. **`/format_input`** and **`/create_random_sample`** remain shape-compatible stubs (no separate LM HTTP service).

## GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|----------------|
| **[CI](.github/workflows/ci.yml)** | Pull requests & pushes to `main` / `master` | `bun test`, bundle acestep v0.0.3 runtime, compile binary on **Ubuntu**, **macOS (arm64)**, **Windows** |
| **[Release](.github/workflows/release.yml)** | **Published releases** & manual `workflow_dispatch` | Same builds, produces `acestep-api-<tag>-linux-x64.tar.gz`, `…-macos-arm64.tar.gz`, `…-windows-x64.zip` (binary + `acestep-runtime/` when present). On **release published**, uploads those archives to the GitHub Release. |

Manual runs (`workflow_dispatch`) build artifacts attached to the workflow run only (not to a draft release).

## License

Your choice for this repo; upstream APIs/models have their own licenses.

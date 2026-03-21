# Agent / contributor notes

## Submodule `ACE-Step-DAW/` — **do not modify for product fixes**

- **`ACE-Step-DAW` is a pinned upstream submodule.** Changes made only inside that directory **cannot be shipped** with this repo: they are **not committed** here and are **discarded** on fresh clones / CI.
- **All behavior fixes** (API compatibility, DAW request normalization, routing, etc.) belong in **`acestep-cpp-api` itself** — typically under `src/`, `docs/`, `test/`.
- Treat the submodule as **read-only vendor source** used only to run **`bun run daw:build`** and produce `dist/`.
- If upstream DAW must change, that is a **separate** process (fork or upstream PR), not something this repo assumes.

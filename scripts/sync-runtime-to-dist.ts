#!/usr/bin/env bun
/** Copy `acestep-runtime/` next to compiled `dist/acestep-api` (or `.exe`). */
import { cp, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";

const root = join(dirname(import.meta.path), "..");
const src = join(root, "acestep-runtime");
const dist = join(root, "dist");

async function main() {
  if (!existsSync(src)) {
    console.warn("[sync-runtime] No acestep-runtime/ — run `bun run bundle:acestep` first.");
    return;
  }
  await mkdir(dist, { recursive: true });
  const dst = join(dist, "acestep-runtime");
  await cp(src, dst, { recursive: true, force: true });
  console.log(`[sync-runtime] Copied acestep-runtime → ${dst}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

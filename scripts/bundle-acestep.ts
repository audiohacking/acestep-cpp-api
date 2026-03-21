#!/usr/bin/env bun
/**
 * Downloads acestep.cpp v0.0.3 release binaries for the current OS/arch and
 * installs the **full** extracted tree under <repo>/acestep-runtime/ (bin/, lib/,
 * and any other bundled shared libraries — not only ace-lm + ace-synth).
 *
 * @see https://github.com/audiohacking/acestep.cpp/releases/tag/v0.0.3
 * @see https://github.com/audiohacking/acestep.cpp/blob/master/README.md
 */
import { mkdir, readdir, chmod, rm, cp, rename } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";

const TAG = "v0.0.3";
const REPO = "audiohacking/acestep.cpp";
const DOWNLOAD_BASE = `https://github.com/${REPO}/releases/download/${TAG}`;

const root = join(dirname(import.meta.path), "..");
const cacheDir = join(root, "bundled", ".cache");
const outRuntime = join(root, "acestep-runtime");

type Asset = { name: string };

function pickAsset(): Asset | null {
  if (process.env.SKIP_ACESTEP_BUNDLE === "1") {
    console.log("[bundle-acestep] SKIP_ACESTEP_BUNDLE=1 — skipping download.");
    return null;
  }
  const { platform, arch } = process;
  if (platform === "linux" && arch === "x64") return { name: "acestep-linux-x64.tar.gz" };
  if (platform === "darwin" && arch === "arm64") return { name: "acestep-macos-arm64-metal.tar.gz" };
  if (platform === "darwin" && arch === "x64") {
    console.warn(
      "[bundle-acestep] No official v0.0.3 asset for darwin-x64. Use Apple Silicon build, Docker, or set ACESTEP_BIN_DIR."
    );
    return null;
  }
  if (platform === "win32" && arch === "x64") return { name: "acestep-windows-x64.zip" };
  console.warn(`[bundle-acestep] Unsupported host ${platform}-${arch}. Set ACESTEP_BIN_DIR manually.`);
  return null;
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walkFiles(p)));
    else out.push(p);
  }
  return out;
}

async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  const lower = archivePath.toLowerCase();
  const args =
    lower.endsWith(".zip") ? ["-xf", archivePath, "-C", destDir] : ["-xzf", archivePath, "-C", destDir];
  const proc = Bun.spawn(["tar", ...args], { stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`tar extract failed with code ${code}`);
  }
}

/** Release archives usually contain a single top-level directory. */
async function resolvePackageRoot(extractRoot: string): Promise<string> {
  const entries = await readdir(extractRoot, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => e.isFile());
  if (dirs.length === 1 && files.length === 0) {
    return join(extractRoot, dirs[0]!.name);
  }
  return extractRoot;
}

/**
 * This app resolves binaries at acestep-runtime/bin/ace-lm. If the bundle used a flat
 * layout (executables + .dylib/.dll next to each other at package root), move those into bin/.
 * Preserves a sibling lib/ directory (common RPATH: @loader_path/../lib).
 */
async function ensureBinLayout(runtimeDir: string, wantLm: string, wantSynth: string): Promise<void> {
  const binDir = join(runtimeDir, "bin");
  if (existsSync(join(binDir, wantLm)) && existsSync(join(binDir, wantSynth))) {
    return;
  }

  await mkdir(binDir, { recursive: true });
  const top = await readdir(runtimeDir, { withFileTypes: true });
  for (const ent of top) {
    const src = join(runtimeDir, ent.name);
    if (ent.name === "bin") continue;
    if (ent.name === "lib" && ent.isDirectory()) continue;
    if (!ent.isFile()) continue;

    const n = ent.name;
    const lower = n.toLowerCase();
    const move =
      n === wantLm ||
      n === wantSynth ||
      lower.endsWith(".dylib") ||
      lower.endsWith(".so") ||
      lower.endsWith(".dll") ||
      lower.endsWith(".node");
    if (move) {
      await rename(src, join(binDir, n));
    }
  }
}

async function chmodMainBinaries(runtimeDir: string, wantLm: string, wantSynth: string): Promise<void> {
  if (process.platform === "win32") return;
  const binDir = join(runtimeDir, "bin");
  for (const name of [wantLm, wantSynth]) {
    const p = join(binDir, name);
    if (existsSync(p)) await chmod(p, 0o755);
  }
}

async function main() {
  const asset = pickAsset();
  if (!asset) return;

  await mkdir(cacheDir, { recursive: true });
  const archivePath = join(cacheDir, asset.name);
  const url = `${DOWNLOAD_BASE}/${asset.name}`;

  if (!existsSync(archivePath)) {
    console.log(`[bundle-acestep] Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Download failed ${res.status}: ${url}`);
    }
    await Bun.write(archivePath, res);
  } else {
    console.log(`[bundle-acestep] Using cached ${archivePath}`);
  }

  const extractRoot = join(cacheDir, `extract-${TAG}-${asset.name.replace(/[^a-z0-9]+/gi, "-")}`);
  await rm(extractRoot, { recursive: true, force: true });
  await mkdir(extractRoot, { recursive: true });
  console.log(`[bundle-acestep] Extracting to ${extractRoot}`);
  await extractArchive(archivePath, extractRoot);

  const packageRoot = await resolvePackageRoot(extractRoot);
  const all = await walkFiles(packageRoot);
  const wantLm = process.platform === "win32" ? "ace-lm.exe" : "ace-lm";
  const wantSynth = process.platform === "win32" ? "ace-synth.exe" : "ace-synth";
  const lm = all.find((p) => (p.split(/[/\\]/).pop() ?? "") === wantLm);
  const synth = all.find((p) => (p.split(/[/\\]/).pop() ?? "") === wantSynth);
  if (!lm || !synth) {
    throw new Error(`Could not find ${wantLm} / ${wantSynth} under ${packageRoot}`);
  }

  await rm(outRuntime, { recursive: true, force: true });
  console.log(`[bundle-acestep] Copying full bundle ${packageRoot} → ${outRuntime}`);
  await cp(packageRoot, outRuntime, { recursive: true });

  await ensureBinLayout(outRuntime, wantLm, wantSynth);
  await chmodMainBinaries(outRuntime, wantLm, wantSynth);

  const installed = await walkFiles(outRuntime);
  const binDir = join(outRuntime, "bin");
  if (!existsSync(join(binDir, wantLm)) || !existsSync(join(binDir, wantSynth))) {
    throw new Error(
      `After install, expected ${wantLm} and ${wantSynth} under ${binDir}. ` +
        `Open an issue with your archive layout (file names under ${packageRoot}).`
    );
  }

  console.log(
    `[bundle-acestep] Installed acestep-runtime: ${installed.length} files (bin + lib + deps).\n` +
      `  ${join(binDir, wantLm)}\n` +
      `  ${join(binDir, wantSynth)}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

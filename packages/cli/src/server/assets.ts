import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundled build emits dist/index.js (assets at dist/assets), while the
// unbundled/source layout resolves to dist/server (assets at dist/assets).
const assetDirCandidates = [
  path.join(__dirname, "assets"),
  path.join(__dirname, "..", "assets"),
] as const;

export function getAssetPath(name: string): string {
  for (const dir of assetDirCandidates) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(assetDirCandidates[0], name);
}

export function readAsset(name: string): string {
  return fs.readFileSync(getAssetPath(name), "utf8");
}

export function assetExists(name: string): boolean {
  return fs.existsSync(getAssetPath(name));
}

import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

// Clean stale output (e.g. from a previous unbundled tsc build) so the
// published tarball only contains the bundled entry + assets.
fs.rmSync(path.join(__dirname, "dist"), { recursive: true, force: true });

/**
 * Bundle the CLI into a single self-contained ESM file. The workspace package
 * `@comment-to-fix/core` is inlined so the published package has no
 * `@comment-to-fix/*` runtime dependencies. `chokidar` stays external and is
 * installed as a normal npm dependency.
 */
const config = {
  entryPoints: [path.join(__dirname, "src/index.ts")],
  outfile: path.join(__dirname, "dist/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["chokidar"],
  banner: {
    js: "#!/usr/bin/env node",
  },
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching CLI...");
} else {
  await esbuild.build(config);
  console.log("Built dist/index.js");
}

import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const css = fs.readFileSync(path.join(__dirname, "src/styles/overlay.css"), "utf8");

const config = {
  entryPoints: [path.join(__dirname, "src/main.tsx")],
  outfile: path.join(__dirname, "dist/overlay.js"),
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: !watch,
  sourcemap: watch,
  jsx: "automatic",
  jsxImportSource: "preact",
  define: {
    __CTF_STYLES__: JSON.stringify(css),
  },
  alias: {
    "@comment-to-fix/core": path.join(__dirname, "../core/src/browser.ts"),
  },
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching overlay...");
} else {
  await esbuild.build(config);
  console.log("Built overlay.js");
}

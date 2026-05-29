import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overlaySrc = path.resolve(__dirname, "../../overlay/dist/overlay.js");
const assetsDir = path.resolve(__dirname, "../dist/assets");

if (!fs.existsSync(overlaySrc)) {
  console.error("Missing overlay bundle. Build @comment-to-fix/overlay first.");
  process.exit(1);
}

fs.mkdirSync(assetsDir, { recursive: true });
fs.copyFileSync(overlaySrc, path.join(assetsDir, "overlay.js"));
console.log("Copied overlay.js to dist/assets/");

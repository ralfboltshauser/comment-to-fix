import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/element-identification.test.ts", "jsdom"],
      ["src/freeze-animations.test.ts", "jsdom"],
      ["src/overlay-storage.test.ts", "jsdom"],
    ],
  },
});

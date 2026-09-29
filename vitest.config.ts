import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "lucide-react": fileURLToPath(
        new URL(
          "./node_modules/lucide-react/dist/cjs/lucide-react.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    server: {
      deps: { inline: [/@tanstack\/react-query/, /lucide-react/, /@radix-ui/] },
    },
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["apps/web/src/**/*.test.tsx"],
  },
});

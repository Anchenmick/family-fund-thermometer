import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        test: {
          name: "app",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        test: {
          name: "convex",
          environment: "edge-runtime",
          globals: true,
          include: ["convex/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
    ],
  },
});

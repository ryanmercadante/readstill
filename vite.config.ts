import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Staging runs unreleased code from main, so its footer also names the commit.
function stagingCommit() {
  if (process.env.CLOUDFLARE_ENV !== "staging") return "";
  const sha = process.env.GITHUB_SHA ?? execSync("git rev-parse HEAD", { encoding: "utf8" });
  return sha.trim().slice(0, 7);
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(stagingCommit()),
  },
  resolve: { tsconfigPaths: true },
  // The Cloudflare plugin must come before tanstackStart() so SSR runs in workerd.
  // devtools() goes first; it strips the devtools from production builds.
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
});

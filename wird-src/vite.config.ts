import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

/** Which build is this? Shown in Settings so you can tell the live app from a cached one. */
function buildStamp() {
  let sha = "dev";
  try {
    sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    /* not a git checkout (e.g. static deploy) */
  }
  return { sha, date: new Date().toISOString().slice(0, 10) };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD__: JSON.stringify(buildStamp()) },
  // Allow preview hosts (e.g. sandbox *.e2b.app domains) to reach the dev server.
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
});

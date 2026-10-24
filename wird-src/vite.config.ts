import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allow preview hosts (e.g. sandbox *.e2b.app domains) to reach the dev server.
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
});

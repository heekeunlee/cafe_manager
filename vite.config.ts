// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

function getAppVersion() {
  try {
    return `git-${execSync("git rev-parse --short HEAD").toString().trim()}`;
  } catch {
    return "dev";
  }
}

export default defineConfig({
  base: "/cafe_manager/",
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  plugins: [react()],
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Versiya belgisi: Vercel'da commit raqami, mahalliy ishda "dev".
export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7)) },
});

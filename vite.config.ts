import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// All Replit dev tooling is loaded dynamically and only in development.
// Production builds never include the runtime error modal, cartographer, or
// dev banner — these are the sources of the "Made in Replit" / dev banner
// that must never appear on prescient-labs.com.
const isDev =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

export default defineConfig({
  plugins: [
    react(),
    ...(isDev
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then(
            (m) => m.default(),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split vendor code into stable chunks so a code-only deploy
        // doesn't invalidate the user's React/Query/Radix cache.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("/@tanstack/")) return "vendor-query";
          if (id.includes("/@radix-ui/")) return "vendor-radix";
          if (id.includes("/lucide-react/") || id.includes("/lucide/")) return "vendor-icons";
          if (id.includes("/@stripe/")) return "vendor-stripe";
          if (id.includes("/recharts/") || id.includes("/d3-")) return "vendor-charts";
          if (id.includes("/date-fns/") || id.includes("/dayjs/")) return "vendor-date";
          return undefined;
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

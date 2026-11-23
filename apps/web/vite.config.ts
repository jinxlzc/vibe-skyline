import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createRelay } from "../relay/src/handler";
import { relayEnvironment } from "../relay/src/config";
export function calendars(fetcher?: typeof fetch): Plugin {
  const handle = createRelay({ ...relayEnvironment(process.env,
    ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost:4173']), fetcher });
  const install = (server: { middlewares: { use: (path: string, handler: any) => void } }) => {
    server.middlewares.use("/api/calendar", (req: any, res: any) => {
      req.url = "/api/calendar" + req.url;
      void handle(req, res);
    });
  };
  return { name: "restricted-calendars", configureServer: install, configurePreviewServer: install };
}
export default defineConfig({
  plugins: [tailwindcss(), react(), calendars()],
  worker: { format: "es" },
  build: { target: "es2022" },
  server: { fs: { allow: ["../.."] } },
});

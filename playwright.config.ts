import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 240000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm start",
    env: { NODE_ENV: "production", PORT: "4173", RELAY_ORIGINS: "http://127.0.0.1:4173" },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});

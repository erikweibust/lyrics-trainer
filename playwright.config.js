// Browser check for the Next/Previous navigation. Kept out of vitest's way:
// vitest has no config file and claims **/*.test.js / **/*.spec.js by default,
// so these files are named *.e2e.js and matched explicitly here.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.js/,
  reporter: [["html", { open: "never" }], ["list"]],
  use: { baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "Chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "Firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "WebKit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 13"] } },
  ],
});

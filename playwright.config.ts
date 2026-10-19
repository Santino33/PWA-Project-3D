import { defineConfig, devices } from "@playwright/test";

const navegadorChrome = {
  executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
};

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4199",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", launchOptions: navegadorChrome } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"], launchOptions: navegadorChrome } },
    { name: "firefox", use: { browserName: "firefox" } },
    ...(process.env.RUN_WEBKIT === "1" ? [{ name: "webkit", use: { browserName: "webkit" as const } }] : []),
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4199 --strictPort",
    url: "http://127.0.0.1:4199/",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

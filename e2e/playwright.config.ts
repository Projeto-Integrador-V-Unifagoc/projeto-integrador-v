import { defineConfig, devices } from "@playwright/test";
import { config, uiEnabled } from "./helpers/config.js";

/**
 * Configuração do executor E2E (spec §4.1). Projetos separam contratos de API /
 * integridade / jornadas (sem navegador) dos testes de UI (Chromium). Traces,
 * screenshots e vídeos só são retidos em falha.
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 4,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: config.apiUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testMatch: ["api/**/*.spec.ts", "integrity/**/*.spec.ts", "journeys/**/*.spec.ts"],
    },
    ...(uiEnabled
      ? [
          {
            name: "ui",
            testMatch: ["ui/**/*.spec.ts"],
            use: { ...devices["Desktop Chrome"], baseURL: config.webUrl },
          },
        ]
      : []),
  ],
});

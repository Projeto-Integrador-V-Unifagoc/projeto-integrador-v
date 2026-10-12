import { defineConfig, devices } from "@playwright/test";
import { config, uiEnabled } from "./helpers/config.js";

/**
 * Configuração do executor E2E (spec §4.1). Projetos separam contratos de API /
 * integridade / jornadas (sem navegador) dos testes de UI (Chromium). Traces,
 * screenshots e vídeos só são retidos em falha.
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1,
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
            // As jornadas da feature exercitam 1280x720 e 390x844 explicitamente.
            timeout: 180_000,
            testMatch: ["ui/**/*.spec.ts"],
            use: { ...devices["Desktop Chrome"], baseURL: config.webUrl },
          },
        ]
      : []),
  ],
});

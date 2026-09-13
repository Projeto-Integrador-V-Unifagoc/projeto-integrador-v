import { defineConfig } from "vitest/config";

// Runner de testes do backend (mesmo Vitest do frontend).
//
// Dois projetos:
//  - "unit": src/**/*.test.ts (menos *.int.test.ts). Isolados: repositorios
//    mockados, nao sobe servidor nem toca banco.
//  - "integration": src/**/*.int.test.ts. Sobem Postgres real via Testcontainers
//    e exercitam as rotas Express com supertest. Exigem Docker; rodam em serie.
//
// "npm test" roda so o projeto "unit" (rapido, sem Docker, e o que o CI usa).
// "npm run test:integration" roda o projeto "integration".
// "npm run test:all" roda os dois.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.int.test.ts",
        "src/app.ts",
        "src/server.ts",
        "src/database/**",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          // Baixar a imagem do Postgres na primeira execucao pode demorar.
          hookTimeout: 120000,
          testTimeout: 30000,
          // Um container por arquivo; sem paralelismo entre arquivos.
          fileParallelism: false,
        },
      },
    ],
  },
});

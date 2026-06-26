import { test as base, expect } from "@playwright/test";
import { Api } from "../helpers/api.js";
import { config } from "../helpers/config.js";
import * as idsHelper from "../helpers/ids.js";
import { login } from "../factories/usuario.factory.js";
import { montarCenario, type Cenario } from "./academic.fixture.js";

/**
 * Fixtures base da suíte (spec §4.2). Fornecem:
 *  - `runId`: identificador único por teste (dados determinísticos, §5.2);
 *  - `api`: cliente anônimo;
 *  - `apiSecretaria`: cliente autenticado como secretaria;
 *  - `novoCenario`: builder do grafo acadêmico isolado.
 */

interface Fixtures {
  runId: string;
  api: Api;
  secretariaToken: string;
  apiSecretaria: Api;
  novoCenario: (opcoes?: { capacidadeTurma?: number; statusPeriodo?: string }) => Promise<Cenario>;
}

export const test = base.extend<Fixtures>({
  runId: async ({}, use) => {
    await use(idsHelper.runId());
  },
  api: async ({ request }, use) => {
    await use(new Api(request));
  },
  secretariaToken: async ({ request }, use) => {
    const token = await login(new Api(request), config.secretaria.email, config.secretaria.senha);
    await use(token);
  },
  apiSecretaria: async ({ request, secretariaToken }, use) => {
    await use(new Api(request, secretariaToken));
  },
  novoCenario: async ({ apiSecretaria }, use) => {
    await use((opcoes) => montarCenario(apiSecretaria, idsHelper.runId(), opcoes));
  },
});

export { expect };

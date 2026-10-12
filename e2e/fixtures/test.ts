import { test as base, expect } from "@playwright/test";
import { Api } from "../helpers/api.js";
import { config } from "../helpers/config.js";
import * as idsHelper from "../helpers/ids.js";
import { login } from "../factories/usuario.factory.js";
import { montarCenario, type AlunoMatriculado, type Cenario, type OpcoesCenario } from "./academic.fixture.js";
import type { ResultadoAcademico } from "../../backend/src/Modules/notas/models/ResultadoAcademico.js";

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
  novoCenario: (opcoes?: OpcoesCenario) => Promise<Cenario>;
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

/** Toda escrita da jornada termina antes destas duas leituras da mesma oferta. */
export async function consultarResultadoJornada(cenario: Cenario, aluno: AlunoMatriculado): Promise<ResultadoAcademico> {
  const boletim = await aluno.apiAluno.get("/notas/me");
  expect(boletim.status).toBe(200);
  const disciplina = boletim.body.disciplinas.find((d: any) => d.resultadoAcademico?.turmaDisciplinaId === cenario.turmaDisciplinaId);
  expect(disciplina, "Boletim deve identificar a oferta por UUID").toBeTruthy();
  const resultado: ResultadoAcademico = disciplina.resultadoAcademico;
  expect(resultado.contratoVersao).toBe(2);
  const rendimento = await cenario.apiProfessor.get(`/notas/turmas/${cenario.turmaDisciplinaId}/rendimento`);
  expect(rendimento.status).toBe(200);
  const linha = rendimento.body.alunos.find((a: any) => a.alunoId === aluno.aluno.id);
  expect(linha, "Rendimento deve identificar o aluno da jornada").toBeTruthy();
  expect(linha.resultadoAcademico).toEqual(resultado);
  expect(resultado.matriculaTurmaDisciplinaId).toBe(linha.matriculaTurmaDisciplinaId);
  return resultado;
}

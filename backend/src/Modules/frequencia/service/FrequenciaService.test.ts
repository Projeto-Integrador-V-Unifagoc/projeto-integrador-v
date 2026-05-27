import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FrequenciaService } from "./FrequenciaService";

const turmaDisciplinaId = "11111111-1111-4111-8111-111111111111";
const alunoId = "22222222-2222-4222-8222-222222222222";
const professorId = "33333333-3333-4333-8333-333333333333";
const matriculaTurmaDisciplinaId = "44444444-4444-4444-8444-444444444444";

function criarService(deps: Record<string, any> = {}) {
  const repository = {
    listarRegistrosDaChamada: async () => [],
    calcularPercentualMatriculaTurmaDisciplina: async () => 100,
    buscarAulaPorId: async () => null,
    obterOuCriarAula: async () => ({ id: "55555555-5555-4555-8555-555555555555" }),
    buscarRegistroPorAulaEMatricula: async () => null,
    criarRegistros: async () => [
      {
        id: "66666666-6666-4666-8666-666666666666",
        aulaId: "55555555-5555-4555-8555-555555555555",
        matriculaTurmaDisciplinaId,
        alunoId,
        turmaDisciplinaId,
        status: "PRESENTE",
        data: "2026-05-01",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      },
    ],
    recalcularPercentualAlunoTurma: async () => 100,
    ...deps.repository,
  };

  const authGateway = {
    obterContexto: async () => ({
      usuarioId: "usuario-1",
      perfil: "PROFESSOR",
      professorId,
    }),
    ...deps.authGateway,
  };

  const periodoGateway = {
    validarData: () => true,
    obterDescricao: () => "2026/1-2",
    ...deps.periodoGateway,
  };

  const professorTurmaGateway = {
    validarVinculo: async () => true,
    ...deps.professorTurmaGateway,
  };

  const alunoTurmaGateway = {
    listarAlunosAtivos: async () => [
      {
        matricula_turma_disciplina_id: matriculaTurmaDisciplinaId,
        aluno_id: alunoId,
        matricula: 1001,
        nome: "Aluno Teste",
        status: "ativa",
      },
    ],
    ...deps.alunoTurmaGateway,
  };

  return new FrequenciaService(
    repository as any,
    authGateway as any,
    periodoGateway as any,
    professorTurmaGateway as any,
    alunoTurmaGateway as any,
  );
}

describe("FrequenciaService", () => {
  it("monta chamada com matricula_turma_disciplina e registro existente", async () => {
    const service = criarService({
      repository: {
        listarRegistrosDaChamada: async () => [
          {
            id: "frequencia-1",
            matricula_turma_disciplina_id: matriculaTurmaDisciplinaId,
            status: "AUSENTE",
            justificativa: "Atestado",
          },
        ],
        calcularPercentualMatriculaTurmaDisciplina: async () => 75,
      },
    });

    const result = await service.obterChamada(turmaDisciplinaId, "2026-05-01");

    assert.equal(result.jaRegistrada, true);
    assert.equal(result.alunos[0].id, alunoId);
    assert.equal(result.alunos[0].matriculaTurmaDisciplinaId, matriculaTurmaDisciplinaId);
    assert.equal(result.alunos[0].status, "AUSENTE");
    assert.equal(result.alunos[0].percentualAtual, 75);
  });

  it("registra frequencia para aluno ativo na turma/disciplina", async () => {
    let registrosRecebidos: any[] = [];
    const service = criarService({
      repository: {
        criarRegistros: async (registros: any[]) => {
          registrosRecebidos = registros;
          return [
            {
              id: "frequencia-1",
              aulaId: "aula-1",
              matriculaTurmaDisciplinaId,
              alunoId,
              turmaDisciplinaId,
              status: "PRESENTE",
              data: "2026-05-01",
              criadoEm: new Date().toISOString(),
              atualizadoEm: new Date().toISOString(),
            },
          ];
        },
      },
    });

    const result = await service.registrarFrequencia({
      turmaDisciplinaId,
      data: "2026-05-01",
      registros: [{ alunoId, status: "PRESENTE" }],
    });

    assert.equal(registrosRecebidos[0].matricula_turma_disciplina_id, matriculaTurmaDisciplinaId);
    assert.equal(result.registros.length, 1);
    assert.equal(result.consolidados[0].situacao, "REGULAR");
  });

  it("bloqueia frequencia duplicada para a mesma aula e matricula", async () => {
    const service = criarService({
      repository: {
        buscarRegistroPorAulaEMatricula: async () => ({ id: "frequencia-existente" }),
      },
    });

    await assert.rejects(
      () =>
        service.registrarFrequencia({
          turmaDisciplinaId,
          data: "2026-05-01",
          registros: [{ alunoId, status: "PRESENTE" }],
        }),
      /Frequencia ja registrada/,
    );
  });

  it("bloqueia status invalido no registro", async () => {
    const service = criarService();

    await assert.rejects(
      () =>
        service.registrarFrequencia({
          turmaDisciplinaId,
          data: "2026-05-01",
          registros: [{ alunoId, status: "ATRASADO" as any }],
        }),
      /Status de frequencia invalido/,
    );
  });
});

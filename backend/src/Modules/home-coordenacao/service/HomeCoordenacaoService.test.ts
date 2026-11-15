import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { HomeCoordenacaoService } from "./HomeCoordenacaoService";

const reqSecretaria = { user: { id: "u1", tipo_usuario: "secretaria" } } as any;

function service(overrides: Record<string, any> = {}) {
  const repository = {
    listarPeriodos: async () => [{ id: "pl1", codigo: "2026.2", ano: 2026, semestre: 2, ativo: true, status: "aberto", data_inicio: "2026-08-01", data_fim: "2026-12-15" }],
    resumoPeriodo: async () => ({ turmas_ativas: 2, ofertas_ativas: 4, alunos_ativos: 30, ofertas_com_horario: 3, avaliacoes: 5, avaliacoes_mapeadas: 4 }),
    diagnosticoQualidade: async () => ({ disciplinas: 10, disciplinas_sem_ementa: 1, disciplinas_sem_competencias: 2, disciplinas_carga_incompleta: 1, cursos: 2, cursos_sem_matriz: 0, turmas: 2, turmas_sem_horario: 1, avaliacoes: 5, avaliacoes_sem_competencia: 1 }),
    listarStatusMatrizes: async () => [{ status: "VIGENTE", total: 2 }, { status: "RASCUNHO", total: 1 }],
    listarPanoramaCursos: async () => [{ id: "c1", codigo: "ADS", nome: "ADS", turmas_ativas: 2, ofertas_ativas: 4, alunos_ativos: 30, ofertas_com_horario: 3 }],
    listarDesempenhoCompetencias: async () => [{ id: "cp1", codigo: "COMP-01", nome: "Lógica", tipo: "TECNICA", total_ofertas: 2, total_cursos: 1, pontos_planejados: 100, pontos_avaliados: 80, soma_ponderada: 4400 }],
    ...overrides,
  };
  const instance = new HomeCoordenacaoService();
  instance.repository = repository as any;
  return instance;
}

describe("HomeCoordenacaoService", () => {
  it("consolida indicadores do periodo para a coordenacao", async () => {
    const resultado = await service().dashboard(reqSecretaria);
    assert.equal(resultado.resumo.coberturaHorarios, 75);
    assert.equal(resultado.resumo.coberturaCompetencias, 80);
    assert.equal(resultado.matrizes.vigentes, 2);
    assert.equal(resultado.panoramaCursos[0].coberturaHorarios, 75);
    assert.equal(resultado.competencias[0].media, 55);
    assert.equal(resultado.competencias[0].classificacao, "DIFICULDADE");
  });

  it("bloqueia perfis sem acesso administrativo", async () => {
    await assert.rejects(() => service().dashboard({ user: { tipo_usuario: "professor" } } as any), /apenas para secretaria/i);
  });

  it("rejeita periodo inexistente", async () => {
    await assert.rejects(() => service().dashboard(reqSecretaria, "inexistente"), /nao encontrado/i);
  });
});


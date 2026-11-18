import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { HomeCoordenacaoService } from "./HomeCoordenacaoService";

const reqSecretaria = { user: { id: "u1", tipo_usuario: "secretaria" } } as any;

function service(overrides: Record<string, any> = {}) {
  const repository = {
    listarPeriodos: async () => [{ id: "pl1", codigo: "2026.2", ano: 2026, semestre: 2, ativo: true, status: "aberto", data_inicio: "2026-08-01", data_fim: "2026-12-15" }],
    resumoPeriodo: async () => ({ turmas_ativas: 2, ofertas_ativas: 4, alunos_ativos: 30, ofertas_com_horario: 3, avaliacoes: 5, avaliacoes_mapeadas: 4 }),
    diagnosticoQualidade: async () => ({ disciplinas: 10, disciplinas_sem_ementa: 1, disciplinas_sem_competencias: 2, disciplinas_carga_incompleta: 1, cursos: 2, cursos_incompletos: 1, cursos_sem_matriz: 0, turmas: 2, turmas_sem_horario: 1, avaliacoes: 5, avaliacoes_sem_competencia: 1 }),
    listarStatusMatrizes: async () => [{ status: "VIGENTE", total: 2 }, { status: "RASCUNHO", total: 1 }],
    listarPanoramaCursos: async () => [{ id: "c1", codigo: "ADS", nome: "ADS", turmas_ativas: 2, ofertas_ativas: 4, alunos_ativos: 30, ofertas_com_horario: 3 }],
    listarDesempenhoCompetencias: async () => [{ id: "cp1", codigo: "COMP-01", nome: "Lógica", tipo: "TECNICA", total_ofertas: 2, total_cursos: 1, pontos_planejados: 100, pontos_avaliados: 80, soma_ponderada: 4400 }],
    buscarCurso: async () => ({ id: "c1", codigo: "ADS", nome: "ADS" }),
    listarMatrizesCurso: async () => [{ id: "mc1", codigo: "ADS-2026", versao: "2026", status: "VIGENTE", vigencia_inicio: "2026-01-01", total_disciplinas: 10, carga_horaria: 600 }],
    listarTurmasCurso: async () => [{ id: "t1", sigla: "ADS1", descricao: "Turma 1", turno: "NOITE", periodo_curricular: 1, capacidade_alunos: 40, status: "ativa", alunos_ativos: 30, ofertas_ativas: 2, ofertas_com_horario: 1 }],
    listarOfertasCurso: async () => [{ id: "td1", status: "ativa", turma_id: "t1", turma_sigla: "ADS1", turno: "NOITE", disciplina_id: "d1", disciplina_codigo: "ALG", disciplina_nome: "Algoritmos", professor_id: "p1", professor_nome: "Professora", total_alunos: 30, total_avaliacoes: 2, avaliacoes_mapeadas: 1 }],
    listarHorariosCurso: async () => [{ id: "h1", turma_disciplina_id: "td1", dia_semana: 1, hora_inicio: "19:00:00", hora_fim: "20:40:00", local: "Lab 1", vigencia_inicio: "2026-08-01", vigencia_fim: "2026-12-15" }],
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

  it("compara os indicadores com o periodo letivo imediatamente anterior", async () => {
    const resultado = await service({
      listarPeriodos: async () => [
        { id: "pl2", codigo: "2026.2", ano: 2026, semestre: 2, ativo: true, status: "aberto", data_inicio: "2026-08-01", data_fim: "2026-12-15" },
        { id: "pl1", codigo: "2026.1", ano: 2026, semestre: 1, ativo: false, status: "encerrado", data_inicio: "2026-02-01", data_fim: "2026-06-30" },
      ],
      resumoPeriodo: async (periodoId: string) => periodoId === "pl2"
        ? { turmas_ativas: 3, ofertas_ativas: 5, alunos_ativos: 36, ofertas_com_horario: 4, avaliacoes: 10, avaliacoes_mapeadas: 8 }
        : { turmas_ativas: 2, ofertas_ativas: 4, alunos_ativos: 30, ofertas_com_horario: 2, avaliacoes: 8, avaliacoes_mapeadas: 4 },
      listarDesempenhoCompetencias: async (periodoId: string) => [{
        id: "cp1", codigo: "COMP-01", nome: "Lógica", tipo: "TECNICA", total_ofertas: 2,
        total_cursos: 1, pontos_planejados: 100, pontos_avaliados: 80,
        soma_ponderada: periodoId === "pl2" ? 5600 : 4800,
      }, {
        id: "cp2", codigo: "COMP-02", nome: "Projetos", tipo: "TECNICA", total_ofertas: 1,
        total_cursos: 1, pontos_planejados: 100, pontos_avaliados: 40, soma_ponderada: 2800,
      }],
    }).dashboard(reqSecretaria, "pl2");

    assert.equal(resultado.comparacaoPeriodoAnterior?.periodo.codigo, "2026.1");
    assert.deepEqual(resultado.comparacaoPeriodoAnterior?.resumo.alunosAtivos, { atual: 36, anterior: 30, variacao: 6 });
    assert.deepEqual(resultado.comparacaoPeriodoAnterior?.resumo.coberturaHorarios, { atual: 80, anterior: 50, variacao: 30 });
    assert.equal(resultado.comparacaoPeriodoAnterior?.competencias[0].variacaoMedia, 10);
    assert.equal(resultado.comparacaoPeriodoAnterior?.competencias.find((item) => item.id === "cp2")?.variacaoMedia, null);
  });

  it("bloqueia perfis sem acesso administrativo", async () => {
    await assert.rejects(() => service().dashboard({ user: { tipo_usuario: "professor" } } as any), /apenas para secretaria/i);
  });

  it("rejeita periodo inexistente", async () => {
    await assert.rejects(() => service().dashboard(reqSecretaria, "inexistente"), /nao encontrado/i);
  });

  it("detalha turmas, ofertas e horarios de um curso", async () => {
    const resultado = await service().detalheCurso(reqSecretaria, "c1", "pl1");
    assert.equal(resultado.curso.codigo, "ADS");
    assert.equal(resultado.resumo.coberturaHorarios, 100);
    assert.equal(resultado.turmas[0].coberturaHorarios, 50);
    assert.equal(resultado.ofertas[0].horarios[0].horaInicio, "19:00");
    assert.equal(resultado.ofertas[0].coberturaCompetencias, 50);
    assert.equal(resultado.competencias[0].classificacao, "DIFICULDADE");
  });

  it("retorna 404 para curso inexistente", async () => {
    await assert.rejects(() => service({ buscarCurso: async () => null }).detalheCurso(reqSecretaria, "x", "pl1"), /curso nao encontrado/i);
  });
});


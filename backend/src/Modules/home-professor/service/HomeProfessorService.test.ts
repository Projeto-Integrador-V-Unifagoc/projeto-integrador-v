import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { HomeProfessorService } from "./HomeProfessorService";

const reqProfessor = { user: { id: "u1", tipo_usuario: "professor" } } as any;

function service(overrides: Record<string, any> = {}) {
  const repository = {
    buscarProfessorPorUsuarioId: async () => ({ id: "p1", nome: "Professora", ativo: true }),
    listarPeriodos: async () => [{ id: "pl1", codigo: "2026.2", ano: 2026, semestre: 2, ativo: true, status: "aberto" }],
    listarAtribuicoes: async () => [{
      turma_disciplina_id: "td1", turma_id: "t1", turma_sigla: "CC01", turma_descricao: "Turma 1", turno: "NOITE",
      curso_id: "c1", curso_nome: "Computacao", disciplina_id: "d1", disciplina_codigo: "ALG", disciplina_nome: "Algoritmos",
      area_conhecimento: "COMPUTACAO", ementa: "Ementa", carga_horaria: 60,
    }],
    listarAlunos: async () => [{ turma_disciplina_id: "td1", matricula_turma_disciplina_id: "mtd1", aluno_id: "a1", matricula: 1, aluno_nome: "Aluno" }],
    listarNotas: async () => [{ turma_disciplina_id: "td1", matricula_turma_disciplina_id: "mtd1", avaliacao_id: "av1", nota_valor: 30 }],
    listarFrequencias: async () => [{ turma_disciplina_id: "td1", matricula_turma_disciplina_id: "mtd1", presencas: 7, faltas: 3 }],
    listarAvaliacoes: async () => [{ id: "av1", turma_disciplina_id: "td1", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Trabalho", valor: 50, notas_lancadas: 1 }],
    listarCompetencias: async () => [],
    ...overrides,
  };
  const instance = new HomeProfessorService();
  instance.repository = repository as any;
  return instance;
}

describe("HomeProfessorService", () => {
  it("agrega somente o contexto do professor autenticado", async () => {
    const resultado = await service().dashboard(reqProfessor);
    assert.equal(resultado.resumo.turmasAtivas, 1);
    assert.equal(resultado.resumo.alunosUnicos, 1);
    assert.equal(resultado.atribuicoes[0].mediaTurma, 60);
    assert.equal(resultado.atribuicoes[0].frequenciaMedia, 70);
    assert.equal(resultado.atribuicoes[0].alunosEmAtencao, 1);
  });

  it("bloqueia perfil que nao seja professor", async () => {
    await assert.rejects(() => service().dashboard({ user: { id: "u1", tipo_usuario: "aluno" } } as any), /apenas para professores/i);
  });

  it("bloqueia professor sem vinculo ativo", async () => {
    await assert.rejects(() => service({ buscarProfessorPorUsuarioId: async () => null }).dashboard(reqProfessor), /sem vinculo/i);
  });

  it("retorna vazio quando nao ha atribuicoes", async () => {
    const resultado = await service({ listarPeriodos: async () => [] }).dashboard(reqProfessor);
    assert.deepEqual(resultado.resumo, { turmasAtivas: 0, disciplinasDistintas: 0, alunosUnicos: 0, lancamentosPendentes: 0 });
  });

  it("normaliza datas do PostgreSQL ao calcular pendencias e proximas avaliacoes", async () => {
    const ontem = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const amanha = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const resultado = await service({
      listarAvaliacoes: async () => [
        { id: "av1", turma_disciplina_id: "td1", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Trabalho", valor: 50, notas_lancadas: 1 },
        { id: "av2", turma_disciplina_id: "td1", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Pendente", valor: 10, notas_lancadas: 0, data_devolucao: ontem },
        { id: "av3", turma_disciplina_id: "td1", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "Proxima", valor: 10, notas_lancadas: 0, data_devolucao: amanha },
      ],
    }).dashboard(reqProfessor);

    assert.equal(resultado.resumo.lancamentosPendentes, 1);
    assert.equal(resultado.avaliacoesProximas.length, 1);
    assert.equal(resultado.avaliacoesProximas[0].data, amanha.toISOString().slice(0, 10));
  });

  it("detalha os pontos de atencao e as avaliacoes de um aluno da turma", async () => {
    const resultado = await service().detalheAluno(reqProfessor, "td1", "a1");

    assert.deepEqual(resultado.aluno, { id: "a1", matricula: 1, nome: "Aluno" });
    assert.equal(resultado.resumo.media, 60);
    assert.equal(resultado.resumo.frequencia, 70);
    assert.equal(resultado.resumo.presencas, 7);
    assert.equal(resultado.resumo.faltas, 3);
    assert.equal(resultado.avaliacoes[0].nota, 30);
    assert.equal(resultado.avaliacoes[0].percentual, 60);
    assert.equal(resultado.pontosAtencao[0].id, "frequencia-critica");
  });

  it("nao permite consultar aluno fora da turma do professor", async () => {
    await assert.rejects(
      () => service().detalheAluno(reqProfessor, "td1", "outro-aluno"),
      /aluno nao encontrado/i,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { FichaService } from "./FichaService";

const matriculaPadrao = { id: "m1", periodo_letivo_codigo: "2026/1", turma_sigla: "A" };
const vinculoPadrao = {
  id: "mtd1", turma_disciplina_id: "td1", disciplina_id: "d1",
  disciplina_nome: "Disciplina", professor_nome: "Prof", status: "ativa",
};

function criar(overrides: {
  aluno?: any;
  matriculas?: any[];
  vinculosPorMatricula?: Record<string, any[] | Error>;
  frequencia?: any;
  documentos?: any;
  periodos?: any;
  avaliacoes?: any;
} = {}) {
  const service = new FichaService();
  (service as any).alunoService = {
    buscarAlunoPorId: async (_id: string) =>
      "aluno" in overrides ? overrides.aluno : { id: "a1", pessoa: { nome: "Aluno Um" } },
  };
  (service as any).matriculaService = {
    listarPorAluno: async (_id: string) => overrides.matriculas ?? [matriculaPadrao],
    listarVinculos: async (matriculaId: string) => {
      const vinculos = overrides.vinculosPorMatricula?.[matriculaId] ?? (matriculaId === "m1" ? [vinculoPadrao] : []);
      if (vinculos instanceof Error) throw vinculos;
      return vinculos;
    },
  };
  (service as any).frequenciaService = {
    consultarAlunoInterno: async (_id: string) => {
      if (overrides.frequencia instanceof Error) throw overrides.frequencia;
      return overrides.frequencia ?? { percentualGeral: 90 };
    },
  };
  (service as any).documentoService = {
    listarPorAluno: async (_id: string) => {
      if (overrides.documentos instanceof Error) throw overrides.documentos;
      return overrides.documentos ?? [{ id: "d1" }];
    },
  };
  (service as any).periodoService = {
    listarPeriodosLetivos: async () => {
      if (overrides.periodos instanceof Error) throw overrides.periodos;
      return overrides.periodos ?? [{ id: "pl1", codigo: "2026/1" }];
    },
  };
  (service as any).notaRepository = {
    buscarAvaliacoesParaFicha: async (_ids: string[]) => {
      if (overrides.avaliacoes instanceof Error) throw overrides.avaliacoes;
      return overrides.avaliacoes ?? [];
    },
  };
  return service;
}

describe("FichaService.montarFicha", () => {
  it("retorna as secoes esperadas da ficha", async () => {
    const ficha = await criar().montarFicha("a1");
    assert.deepEqual(Object.keys(ficha).sort(), ["aluno", "documentos", "frequencia", "matriculas", "notas", "periodos"].sort());
    assert.equal(ficha.aluno.id, "a1");
    assert.deepEqual(ficha.documentos, [{ id: "d1" }]);
  });

  it("expande cada matricula nos seus vinculos de turma/disciplina", async () => {
    const ficha = await criar().montarFicha("a1");
    assert.equal(ficha.matriculas.length, 1);
    assert.equal(ficha.matriculas[0].matricula_turma_disciplina_id, "mtd1");
    assert.equal(ficha.matriculas[0].disciplina_nome, "Disciplina");
    assert.equal(ficha.matriculas[0].periodo_codigo, "2026/1");
  });

  it("preenche a matricula sem vinculo com campos nulos, sem perder a linha", async () => {
    const ficha = await criar({ vinculosPorMatricula: { m1: [] } }).montarFicha("a1");
    assert.equal(ficha.matriculas.length, 1);
    assert.equal(ficha.matriculas[0].matricula_turma_disciplina_id, null);
    assert.equal(ficha.matriculas[0].disciplina_nome, null);
  });

  it("expande uma matricula com multiplos vinculos em multiplas linhas", async () => {
    const vinculos = [
      { ...vinculoPadrao, id: "mtd1", disciplina_nome: "POO" },
      { ...vinculoPadrao, id: "mtd2", disciplina_nome: "Banco de Dados" },
    ];
    const ficha = await criar({ vinculosPorMatricula: { m1: vinculos } }).montarFicha("a1");
    assert.equal(ficha.matriculas.length, 2);
    assert.deepEqual(ficha.matriculas.map((m: any) => m.disciplina_nome), ["POO", "Banco de Dados"]);
  });

  it("ignora falha ao listar vinculos de uma matricula, tratando-a como sem vinculo", async () => {
    const ficha = await criar({ vinculosPorMatricula: { m1: new Error("falha") } }).montarFicha("a1");
    assert.equal(ficha.matriculas.length, 1);
    assert.equal(ficha.matriculas[0].matricula_turma_disciplina_id, null);
  });

  it("agrupa avaliacoes da mesma disciplina em um unico bloco de notas", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "PROVA", descricao_avaliacao: "P1", valor: 40, nota: 32, matricula_turma_disciplina_id: "mtd1" },
      { id: "av2", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "TRABALHO", descricao_avaliacao: "T1", valor: 60, nota: 48, matricula_turma_disciplina_id: "mtd1" },
    ];
    const ficha = await criar({ avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas.length, 1);
    assert.equal(ficha.notas[0].avaliacoes.length, 2);
    // 80 pontos em 100 => média 80, situação aprovado
    assert.equal(ficha.notas[0].media, 80);
    assert.equal(ficha.notas[0].situacao, "aprovado");
    assert.equal(ficha.notas[0].periodoLetivo, "2026/1");
  });

  it("trata nota nao lancada como pendente (nao conta como zero)", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "PROVA", valor: 100, nota: null, matricula_turma_disciplina_id: "mtd1" },
    ];
    const ficha = await criar({ avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas[0].situacao, "nao_lancada");
  });

  it("usa o semestre (turma_sigla) da matricula quando nao ha periodo_letivo_codigo", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "PROVA", valor: 100, nota: 80, matricula_turma_disciplina_id: "mtd1" },
    ];
    const ficha = await criar({
      matriculas: [{ id: "m1", turma_sigla: "2026-2" }],
      avaliacoes,
    }).montarFicha("a1");
    assert.equal(ficha.notas[0].periodoLetivo, "2026-2");
  });

  it("mantem periodoLetivo nulo quando a avaliacao nao referencia matricula conhecida", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "PROVA", valor: 100, nota: 80, matricula_turma_disciplina_id: "mtd-desconhecida" },
    ];
    const ficha = await criar({ avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas[0].periodoLetivo, null);
  });

  it("mantem periodoLetivo nulo quando a avaliacao nao tem matricula vinculada", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "PROVA", valor: 100, nota: 80 },
    ];
    const ficha = await criar({ avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas[0].periodoLetivo, null);
  });

  it("usa os fallbacks de identificacao quando disciplina/turma nao trazem os campos preferenciais", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_nome: "POO", tipo_avaliacao: "PROVA", valor: 100, nota: 80, turma_sigla: "A" },
    ];
    const ficha = await criar({ aluno: { id: "a1" }, avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas[0].disciplinaId, null);
    assert.equal(ficha.notas[0].alunoNome, null);
    assert.equal(ficha.notas[0].turmaId, null);
    assert.equal(ficha.notas[0].turmaNome, "A");
  });

  it("agrupa por id da avaliacao quando nem disciplina nem turma sao identificaveis", async () => {
    const avaliacoes = [
      { id: "av1", tipo_avaliacao: "PROVA", valor: 100, nota: 80 },
      { id: "av2", tipo_avaliacao: "PROVA", valor: 100, nota: 90 },
    ];
    const ficha = await criar({ avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas.length, 2);
  });

  it("trata peso ausente ou nao numerico como zero", async () => {
    const avaliacoes = [
      { id: "av1", disciplina_id: "disc1", disciplina_nome: "POO", turma_disciplina_id: "td1", tipo_avaliacao: "PROVA", valor: null, nota: 0, matricula_turma_disciplina_id: "mtd1" },
    ];
    const ficha = await criar({ avaliacoes }).montarFicha("a1");
    assert.equal(ficha.notas[0].avaliacoes[0].peso, 0);
  });

  it("nao quebra quando servicos auxiliares falham", async () => {
    const ficha = await criar({
      frequencia: new Error("frequencia indisponivel"),
      documentos: new Error("documentos indisponivel"),
      periodos: new Error("periodos indisponivel"),
      avaliacoes: new Error("notas indisponivel"),
    }).montarFicha("a1");
    assert.equal(ficha.frequencia, undefined);
    assert.deepEqual(ficha.documentos, []);
    assert.deepEqual(ficha.periodos, []);
    assert.deepEqual(ficha.notas, []);
  });
});

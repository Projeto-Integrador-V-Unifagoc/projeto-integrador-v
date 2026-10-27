import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DisciplinaService } from "./DisciplinaService";

const completa = (extra: Record<string, any> = {}) => ({
  codigo: "MAT101", nome: "Matematica", areaConhecimento: "MATEMATICA", ementa: "Fundamentos.",
  cargaHoraria: 60, cargaHorariaTeorica: 40, cargaHorariaPratica: 10,
  cargaHorariaLaboratorio: 10, cargaHorariaExtensao: 0, competencias: [], ...extra,
});

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    transacao: async (callback: any) => callback({}),
    buscarDisciplinaPorCodigo: async (_codigo: string) => null,
    buscarDisciplinaPorId: async (_id: string) => ({ id: "d1", codigo: "MAT101", nome: "Matematica", carga_horaria: 60 }),
    criarDisciplina: async (data: any) => data,
    listarDisciplinas: async () => [],
    atualizarDisciplina: async (_id: string, data: any) => ({ id: _id, ...data }),
    removerDisciplina: async (_id: string) => 1,
    possuiVinculos: async () => false,
    buscarCompetenciasAtivas: async (ids: string[]) => ids.map((id) => ({ id })),
    substituirCompetencias: async () => undefined,
    listarCompetenciasDaDisciplina: async () => [],
    ...overrides,
  };
  const service = new DisciplinaService();
  service.disciplinaRepository = repository as any;
  return { service, repository };
}

describe("DisciplinaService.criarDisciplina", () => {
  it("cria cadastro completo e normaliza codigo", async () => {
    let salvo: any;
    const { service } = criar({ criarDisciplina: async (d: any) => ((salvo = d), d) });
    await service.criarDisciplina(completa({ codigo: " mat101 " }));
    assert.ok(salvo.id);
    assert.equal(salvo.codigo, "MAT101");
    assert.equal(salvo.carga_horaria, 60);
    assert.equal(salvo.ativo, true);
  });

  it("rejeita composicao de carga divergente", async () => {
    const { service } = criar();
    await assert.rejects(() => service.criarDisciplina(completa({ cargaHorariaTeorica: 30 })), /soma das cargas/i);
  });

  it("rejeita codigo ja existente", async () => {
    const { service } = criar({ buscarDisciplinaPorCodigo: async () => ({ id: "outra" }) });
    await assert.rejects(() => service.criarDisciplina(completa()), /Ja existe disciplina com este codigo/);
  });

  it("rejeita competencia repetida", async () => {
    const { service } = criar();
    const competencia = { competenciaId: "c1", nivelEsperado: "DESENVOLVER" };
    await assert.rejects(() => service.criarDisciplina(completa({ competencias: [competencia, competencia] })), /repetida/i);
  });
});

describe("DisciplinaService.atualizarDisciplina", () => {
  it("retorna null quando a disciplina nao existe", async () => {
    const { service } = criar({ buscarDisciplinaPorId: async () => null });
    assert.equal(await service.atualizarDisciplina("x", { nome: "Novo" }), null);
  });

  it("rejeita troca para um codigo usado", async () => {
    const { service } = criar({
      buscarDisciplinaPorId: async () => ({ id: "d1", codigo: "MAT101", nome: "Mat", carga_horaria: 60 }),
      buscarDisciplinaPorCodigo: async () => ({ id: "d2" }),
    });
    await assert.rejects(() => service.atualizarDisciplina("d1", { codigo: "MAT202" }), /Ja existe/);
  });

  it("preserva cadastro legado em atualizacao de nome", async () => {
    let salvo: any;
    const { service } = criar({ atualizarDisciplina: async (_id: string, data: any) => ((salvo = data), data) });
    await service.atualizarDisciplina("d1", { nome: "Matematica I" });
    assert.equal(salvo.nome, "Matematica I");
    assert.equal(salvo.carga_horaria_teorica, null);
  });
});

describe("DisciplinaService remocao", () => {
  it("bloqueia exclusao quando existem vinculos", async () => {
    const { service } = criar({ possuiVinculos: async () => true });
    await assert.rejects(() => service.removerDisciplina("d1"), /desative-a/i);
  });

  it("remove disciplina sem vinculos", async () => {
    const { service } = criar();
    assert.equal(await service.removerDisciplina("d1"), 1);
  });
});

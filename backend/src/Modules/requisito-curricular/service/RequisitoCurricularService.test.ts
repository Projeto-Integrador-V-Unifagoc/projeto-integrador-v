import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { RequisitoCurricularService } from "./RequisitoCurricularService";

function service(overrides: Record<string, any> = {}) {
  const instance = new RequisitoCurricularService();
  instance.matrizRepository = { buscarPorId: async () => ({ id: "mc1" }) } as any;
  instance.repository = {
    listarPorMatriz: async () => [],
    buscarItem: async (id: string) => ({ id, matriz_curricular_id: "mc1", matriz_status: "RASCUNHO" }),
    buscarRelacao: async () => null,
    listarArestas: async () => [],
    criar: async (data: any) => data,
    buscarPorId: async () => ({ id: "r1", matriz_status: "RASCUNHO" }),
    atualizar: async (_id: string, tipo: string) => ({ id: "r1", tipo }),
    remover: async () => 1,
    ...overrides,
  } as any;
  return instance;
}

describe("RequisitoCurricularService", () => {
  it("cria requisito entre itens da mesma matriz", async () => {
    const resultado = await service().criar({ cursoDisciplinaId: "cd2", requisitoCursoDisciplinaId: "cd1", tipo: "recomendado" });
    assert.equal(resultado.curso_disciplina_id, "cd2");
    assert.equal(resultado.requisito_curso_disciplina_id, "cd1");
    assert.equal(resultado.tipo, "RECOMENDADO");
  });

  it("impede autorreferencia", async () => {
    await assert.rejects(() => service().criar({ cursoDisciplinaId: "cd1", requisitoCursoDisciplinaId: "cd1" }), /dela mesma/i);
  });

  it("impede requisito entre versoes diferentes", async () => {
    await assert.rejects(() => service({ buscarItem: async (id: string) => ({ id, matriz_curricular_id: id === "cd1" ? "mc1" : "mc2", matriz_status: "RASCUNHO" }) }).criar({ cursoDisciplinaId: "cd1", requisitoCursoDisciplinaId: "cd2" }), /mesma versao/i);
  });

  it("detecta ciclo indireto", async () => {
    const arestas = [
      { curso_disciplina_id: "cd2", requisito_curso_disciplina_id: "cd3" },
      { curso_disciplina_id: "cd3", requisito_curso_disciplina_id: "cd1" },
    ];
    await assert.rejects(() => service({ listarArestas: async () => arestas }).criar({ cursoDisciplinaId: "cd1", requisitoCursoDisciplinaId: "cd2" }), /ciclo/i);
  });

  it("bloqueia alteracao em matriz publicada", async () => {
    await assert.rejects(() => service({ buscarPorId: async () => ({ id: "r1", matriz_status: "VIGENTE" }) }).remover("r1"), /rascunho/i);
  });
});


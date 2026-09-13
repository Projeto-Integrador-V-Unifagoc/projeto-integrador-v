import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { CursoService } from "./CursoService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarCurso: async (data: any) => data,
    listarCursos: async () => [],
    buscarCursoPorId: async () => ({ id: "c1" }),
    atualizarCurso: async (_id: string, data: any) => data,
    removerCurso: async () => 1,
    ...overrides,
  };
  const service = new CursoService();
  service.cursoRepository = repository as any;
  return { service, repository };
}

describe("CursoService.criarCurso", () => {
  it("gera id e mapeia departamentoId para departamento_id", async () => {
    let salvo: any;
    const { service } = criar({ criarCurso: async (d: any) => ((salvo = d), d) });
    await service.criarCurso({ codigo: "SI", nome: "Sistemas de Informacao", departamentoId: "dep1" });
    assert.ok(salvo.id);
    assert.equal(salvo.departamento_id, "dep1");
  });
});

describe("CursoService.removerCurso", () => {
  it("traduz erro de turma vinculada", async () => {
    const { service } = criar({
      removerCurso: async () => {
        throw { constraint: "turma_curso_id_foreign" };
      },
    });
    await assert.rejects(() => service.removerCurso("c1"), /possui turmas cadastradas/);
  });

  it("traduz erro de foreign key RESTRICT (codigo 23503)", async () => {
    const { service } = criar({
      removerCurso: async () => {
        throw { code: "23503" };
      },
    });
    await assert.rejects(() => service.removerCurso("c1"), /possui registros vinculados/);
  });

  it("repropaga erros nao reconhecidos", async () => {
    const original = new Error("falha inesperada");
    const { service } = criar({
      removerCurso: async () => {
        throw original;
      },
    });
    await assert.rejects(() => service.removerCurso("c1"), /falha inesperada/);
  });

  it("retorna o resultado do repositorio quando remove com sucesso", async () => {
    const { service } = criar({ removerCurso: async () => 1 });
    assert.equal(await service.removerCurso("c1"), 1);
  });

  it("traduz mensagem/detalhe contendo a constraint de turma", async () => {
    const { service } = criar({ removerCurso: async () => { throw { message: "turma_curso_id_foreign violado" }; } });
    await assert.rejects(() => service.removerCurso("c1"), /possui turmas cadastradas/);
    const { service: service2 } = criar({ removerCurso: async () => { throw { detail: "turma_curso_id_foreign" }; } });
    await assert.rejects(() => service2.removerCurso("c1"), /possui turmas cadastradas/);
  });

  it("traduz mensagem/detalhe RESTRICT sem o codigo 23503", async () => {
    const { service } = criar({ removerCurso: async () => { throw { message: "violates RESTRICT setting of foreign key constraint" }; } });
    await assert.rejects(() => service.removerCurso("c1"), /possui registros vinculados/);
  });
});

describe("CursoService leitura e atualizacao", () => {
  it("lista todos os cursos", async () => {
    const lista = [{ id: "c1" }];
    const { service } = criar({ listarCursos: async () => lista });
    assert.deepEqual(await service.listarCursos(), lista);
  });

  it("busca um curso pelo id", async () => {
    const curso = { id: "c1" };
    const { service } = criar({ buscarCursoPorId: async () => curso as any });
    assert.deepEqual(await service.buscarCursoPorId("c1"), curso);
  });

  it("atualiza mapeando departamentoId para departamento_id", async () => {
    let salvo: any;
    const { service } = criar({ atualizarCurso: async (_id: string, d: any) => ((salvo = d), d) });
    await service.atualizarCurso("c1", { codigo: "SI", nome: "Sistemas", departamentoId: "dep2" });
    assert.equal(salvo.departamento_id, "dep2");
  });
});

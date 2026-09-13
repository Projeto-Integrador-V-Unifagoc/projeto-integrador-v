import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DocumentoService } from "./DocumentoService";

function criar(overrides: Record<string, any> = {}, matriculaOverrides: Record<string, any> = {}) {
  const chamadas: any[] = [];
  const repository = {
    criar: async (dados: any) => ({ id: "doc1", ...dados }),
    listarTodos: async () => [],
    listarPorAluno: async (_id: string) => [],
    buscarPorId: async (_id: string) => ({ id: "doc1", aluno_id: "a1", status: "PENDENTE" }),
    validar: async (id: string, status: string, obs?: string) => ({ id, status, observacao: obs ?? null, aluno_id: "a1" }),
    contarDocumentosPendentesOuReprovados: async (_alunoId: string) => 0,
    deletar: async (_id: string) => undefined,
    ...overrides,
  };
  const matriculaService = {
    matricularAutomaticamente: async (alunoId: string) => {
      chamadas.push(["matricularAutomaticamente", alunoId]);
    },
    ...matriculaOverrides,
  };
  const service = new DocumentoService();
  (service as any).repository = repository;
  (service as any).matriculaService = matriculaService;
  return { service, repository, chamadas };
}

describe("DocumentoService.criar", () => {
  it("aceita tipo valido", async () => {
    const { service } = criar();
    const doc = await service.criar({ aluno_id: "a1", tipo_documento: "RG", nome_arquivo: "rg.pdf", caminho_arquivo: "/x" } as any);
    assert.equal(doc.id, "doc1");
  });

  it("rejeita tipo invalido", async () => {
    const { service } = criar();
    await assert.rejects(() => service.criar({ tipo_documento: "SELFIE" } as any), /Tipo inválido/);
  });
});

describe("DocumentoService.buscarPorId", () => {
  it("lanca erro quando o documento nao existe", async () => {
    const { service } = criar({ buscarPorId: async () => null });
    await assert.rejects(() => service.buscarPorId("x"), /não encontrado/);
  });

  it("retorna o documento quando encontrado", async () => {
    const doc = { id: "doc1", aluno_id: "a1", status: "PENDENTE" };
    const { service } = criar({ buscarPorId: async () => doc as any });
    assert.deepEqual(await service.buscarPorId("doc1"), doc);
  });
});

describe("DocumentoService.validar", () => {
  it("rejeita status fora da lista permitida", async () => {
    const { service } = criar();
    await assert.rejects(() => service.validar("doc1", "TALVEZ"), /Status inválido/);
  });

  it("nao mexe na matricula ao reprovar", async () => {
    const { service, chamadas } = criar();
    await service.validar("doc1", "REPROVADO");
    assert.deepEqual(chamadas, []);
  });

  it("matricula automaticamente o aluno ao aprovar quando nao restam pendencias", async () => {
    const { service, chamadas } = criar({ contarDocumentosPendentesOuReprovados: async () => 0 });
    await service.validar("doc1", "APROVADO");
    assert.deepEqual(chamadas, [["matricularAutomaticamente", "a1"]]);
  });

  it("nao matricula o aluno ao aprovar enquanto houver pendencias", async () => {
    const { service, chamadas } = criar({ contarDocumentosPendentesOuReprovados: async () => 2 });
    await service.validar("doc1", "APROVADO");
    assert.deepEqual(chamadas, []);
  });

  it("ignora falha da matricula automatica ao aprovar", async () => {
    const { service } = criar(
      { contarDocumentosPendentesOuReprovados: async () => 0 },
      { matricularAutomaticamente: async () => { throw new Error("falha"); } },
    );
    const resultado = await service.validar("doc1", "APROVADO");
    assert.equal(resultado.status, "APROVADO");
  });

  it("rejeita documento inexistente", async () => {
    const { service } = criar({ buscarPorId: async () => null });
    await assert.rejects(() => service.validar("doc1", "APROVADO"), /não encontrado/);
  });
});

describe("DocumentoService leitura", () => {
  it("lista todos os documentos", async () => {
    const lista = [{ id: "doc1" }];
    const { service } = criar({ listarTodos: async () => lista as any });
    assert.deepEqual(await service.listarTodos(), lista);
  });

  it("lista os documentos de um aluno", async () => {
    const lista = [{ id: "doc1" }];
    const { service } = criar({ listarPorAluno: async () => lista as any });
    assert.deepEqual(await service.listarPorAluno("a1"), lista);
  });
});

describe("DocumentoService.deletar", () => {
  it("rejeita documento inexistente", async () => {
    const { service } = criar({ buscarPorId: async () => null });
    await assert.rejects(() => service.deletar("x"), /não encontrado/);
  });

  it("deleta o documento existente", async () => {
    let idDeletado: string | undefined;
    const { service } = criar({ deletar: async (id: string) => { idDeletado = id; } });
    await service.deletar("doc1");
    assert.equal(idDeletado, "doc1");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import knex, { type Knex } from "knex";
import { FrequenciaConsolidadaGateway } from "./FrequenciaConsolidadaGateway";
import { FrequenciaRepository } from "../repository/FrequenciaRepository";

// A fronteira SQL usa o executor fornecido. Importar o repository não carrega ambiente/DB.
vi.mock("../../../database/index.js", () => ({
  default: vi.fn(() => { throw new Error("O gateway não pode consultar o banco global."); }),
}));

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const executor = Object.freeze({ snapshot: "executor-frequencia-comum" }) as unknown as Knex.Transaction;
afterEach(() => vi.restoreAllMocks());

describe("FrequenciaConsolidadaGateway - lote autorizado no executor comum", () => {
  it("consolida todas as matrículas numa chamada e conserva o executor", async () => {
    const carregarContagensPorMatriculas = vi.fn(async () => [
      { matricula_turma_disciplina_id: A, presencas: "3", faltas: "1" },
      { matricula_turma_disciplina_id: B, presencas: "1", faltas: "1" },
    ]);
    const gateway = new FrequenciaConsolidadaGateway({ carregarContagensPorMatriculas });
    const resultados = await gateway.carregar([A, B], executor);
    expect(carregarContagensPorMatriculas).toHaveBeenCalledExactlyOnceWith([A, B], executor);
    expect(resultados).toEqual(new Map([
      [A, { presencas: 3, faltas: 1, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" }],
      [B, { presencas: 1, faltas: 1, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" }],
    ]));
  });

  it("preenche apenas matrículas solicitadas sem frequência com 0/0 e pendência", async () => {
    const gateway = new FrequenciaConsolidadaGateway({ carregarContagensPorMatriculas: vi.fn(async () => []) });
    const resultados = await gateway.carregar([A, B], executor);
    expect([...resultados.keys()]).toEqual([A, B]);
    expect(resultados.get(A)).toEqual({ presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" });
    expect(resultados.get(B)).toEqual(resultados.get(A));
    expect(resultados.get(A)).not.toBe(resultados.get(B));
  });

  it("não inclui um grupo fora da lista autorizada na saída", async () => {
    const gateway = new FrequenciaConsolidadaGateway({ carregarContagensPorMatriculas: vi.fn(async () => [
      { matricula_turma_disciplina_id: A, presencas: "0", faltas: "2" },
      { matricula_turma_disciplina_id: C, presencas: "5", faltas: "0" },
    ]) });
    const resultados = await gateway.carregar([A], executor);
    expect([...resultados.keys()]).toEqual([A]);
    expect(resultados.get(A)).toMatchObject({ presencas: 0, faltas: 2, percentual: 0, requisito: "INSUFICIENTE" });
  });

  it("deduplica IDs mantendo uma consulta em lote", async () => {
    const carregarContagensPorMatriculas = vi.fn(async () => []);
    const gateway = new FrequenciaConsolidadaGateway({ carregarContagensPorMatriculas });
    expect((await gateway.carregar([A, A, B], executor)).size).toBe(2);
    expect(carregarContagensPorMatriculas).toHaveBeenCalledExactlyOnceWith([A, B], executor);
  });

  it("lista vazia não consulta nem concede frequência comprovada", async () => {
    const carregarContagensPorMatriculas = vi.fn(async () => []);
    const gateway = new FrequenciaConsolidadaGateway({ carregarContagensPorMatriculas });
    expect(await gateway.carregar([], executor)).toEqual(new Map());
    expect(carregarContagensPorMatriculas).not.toHaveBeenCalled();
  });

  it("propaga a falha original sem devolver pendência ou 100%", async () => {
    const falha = new Error("Fonte de frequência indisponível");
    const gateway = new FrequenciaConsolidadaGateway({ carregarContagensPorMatriculas: vi.fn(async () => { throw falha; }) });
    await expect(gateway.carregar([A, B], executor)).rejects.toBe(falha);
  });
});

describe("FrequenciaRepository - consulta agrupada restrita", () => {
  it("consulta o executor recebido uma vez com GROUP BY, sem aulas ou justificativas no cálculo", async () => {
    const banco = knex({ client: "pg" });
    vi.spyOn(banco.client, "acquireConnection").mockResolvedValue({} as any);
    vi.spyOn(banco.client, "releaseConnection").mockResolvedValue(undefined);
    const linhas = [{ matricula_turma_disciplina_id: A, presencas: "3", faltas: "1" }];
    const consultar = vi.spyOn(banco.client, "query").mockImplementation(async (_conexao: any, consulta: any) => ({
      ...consulta, response: { command: "SELECT", rows: linhas },
    }));
    try {
      expect(await new FrequenciaRepository().carregarContagensPorMatriculas([A, B], banco)).toEqual(linhas);
      expect(consultar).toHaveBeenCalledTimes(1);
      const consulta = consultar.mock.calls[0][1] as { sql: string; bindings: unknown[] };
      expect(consulta.sql).toContain('from "frequencia"');
      expect(consulta.sql).toContain('group by "matricula_turma_disciplina_id"');
      expect(consulta.sql).toContain('"matricula_turma_disciplina_id" in (?, ?)');
      expect(consulta.sql).toMatch(/PRESENTE|filter/i);
      expect(consulta.sql).toMatch(/AUSENTE|filter/i);
      expect(consulta.sql).not.toMatch(/join|aula|justificativa/i);
      expect(consulta.bindings).toEqual(expect.arrayContaining([A, B]));
    } finally { await banco.destroy(); }
  });
});

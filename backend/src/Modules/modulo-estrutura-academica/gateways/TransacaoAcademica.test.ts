import type { Knex } from "knex";
import { describe, expect, it, vi } from "vitest";
import { ConflitoAcademico, snapshotAcademico, transacaoAcademica } from "./TransacaoAcademica";

function bancoSimulado() {
  const locks: Array<{ tabela: string; ids: string[]; modo: string }> = [];
  const executores: Knex.Transaction[] = [];
  const transacao = vi.fn(async (callback: (trx: Knex.Transaction) => unknown) => {
    const executor = ((tabela: string) => {
      let ids: string[] = [];
      const consulta = {
        whereIn: (_campo: string, valores: string[]) => { ids = valores; return consulta; },
        orderBy: () => consulta,
        select: () => consulta,
        forShare: async () => { locks.push({ tabela, ids, modo: "share" }); return []; },
        forUpdate: async () => { locks.push({ tabela, ids, modo: "update" }); return []; },
      };
      return consulta;
    }) as unknown as Knex.Transaction;
    executores.push(executor);
    return callback(executor);
  });
  return { db: { transaction: transacao } as unknown as Knex, transacao, locks, executores };
}

describe("transação acadêmica ordenada", () => {
  it("rejeita transação já aberta antes de descobrir, bloquear ou escrever", async () => {
    const banco = bancoSimulado();
    banco.db.isTransaction = true;
    const descobrir = vi.fn(async () => ({ ofertas: ["oferta"] }));
    const executar = vi.fn(async () => "salvo");

    await expect(transacaoAcademica(banco.db, { descobrir }, executar))
      .rejects.toThrow("transação já aberta");
    expect(banco.transacao).not.toHaveBeenCalled();
    expect(descobrir).not.toHaveBeenCalled();
    expect(executar).not.toHaveBeenCalled();
    expect(banco.locks).toEqual([]);
  });

  it("ordena classes e UUIDs, sem duplicatas, e protege vínculos decisivos", async () => {
    const banco = bancoSimulado();
    const descubrir = vi.fn(async () => ({
      autorizacoes: ["b", "a"], notas: ["b", "a"], matriculasDisciplinas: ["b", "a"],
      avaliacoes: ["b", "a"], ofertas: ["b", "a"], regras: ["b", "a"],
      cursosDisciplinas: ["b", "a"], turmas: ["b", "a", "a"], periodos: ["b", "a"],
      professores: ["b", "a"], matriculas: ["b", "a"],
    }));
    const executar = vi.fn(async (_trx: Knex.Transaction) => "salvo");
    expect(await transacaoAcademica(banco.db, { descobrir: descubrir }, executar)).toBe("salvo");
    expect(banco.locks.map(({ tabela }) => tabela)).toEqual([
      "piv.periodo_letivo", "piv.turma", "piv.curso_disciplina", "piv.professor",
      "piv.regra_pontuacao", "piv.turma_disciplina", "piv.avaliacao", "piv.matricula",
      "piv.matricula_turma_disciplina", "piv.nota", "piv.nota_autorizacao_excepcional",
    ]);
    expect(banco.locks.every(({ ids }) => JSON.stringify(ids) === '["a","b"]')).toBe(true);
    expect(banco.locks.map(({ modo }) => modo)).toEqual([
      "share", "share", "share", "share", "update", "update", "update", "share", "update", "update", "update",
    ]);
    expect(descubrir).toHaveBeenCalledTimes(2);
    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar.mock.calls[0][0]).toBe(banco.executores[0]);
  });

  it("pais escritores usam UPDATE e notas de ofertas distintas não bloqueiam regra", async () => {
    const banco = bancoSimulado();
    await transacaoAcademica(banco.db, {
      descobrir: async () => ({ periodos: ["p"], ofertas: ["o"], professores: ["doc"], matriculas: ["m"] }),
      escritaPais: ["periodos", "professores", "matriculas"],
    }, async () => undefined);
    expect(banco.locks.map(({ modo }) => modo)).toEqual(["update", "update", "update", "update"]);
    expect(banco.locks.some(({ tabela }) => tabela === "piv.regra_pontuacao")).toBe(false);
  });

  it("chave alterada reinicia a transação inteira antes de executar a escrita", async () => {
    const banco = bancoSimulado();
    let leitura = 0;
    const executar = vi.fn(async (_trx: Knex.Transaction) => 1);
    await transacaoAcademica(banco.db, {
      descobrir: async () => ({ periodos: [++leitura === 1 ? "antigo" : "novo"], ofertas: ["oferta"] }),
    }, executar);
    expect(banco.transacao).toHaveBeenCalledTimes(2);
    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar.mock.calls[0][0]).toBe(banco.executores[1]);
    expect(banco.locks.map(({ tabela, ids }) => [tabela, ids])).toEqual([
      ["piv.periodo_letivo", ["antigo"]], ["piv.turma_disciplina", ["oferta"]],
      ["piv.periodo_letivo", ["novo"]], ["piv.turma_disciplina", ["oferta"]],
    ]);
  });

  it("limita mudanças persistentes a três tentativas e não realiza escrita", async () => {
    const banco = bancoSimulado();
    let leitura = 0;
    const executar = vi.fn();
    await expect(transacaoAcademica(banco.db, {
      descobrir: async () => ({ ofertas: [String(++leitura)] }),
    }, executar)).rejects.toMatchObject({ status: 409, codigo: "CONFLITO_CONCORRENCIA" });
    expect(banco.transacao).toHaveBeenCalledTimes(3);
    expect(executar).not.toHaveBeenCalled();
  });

  it.each(["40P01", "40001"])("reinicia a transação em conflito PostgreSQL %s", async (codigo) => {
    const banco = bancoSimulado();
    const executar = vi.fn().mockRejectedValueOnce({ code: codigo }).mockResolvedValue("ok");
    expect(await transacaoAcademica(banco.db, { descobrir: async () => ({ ofertas: ["o"] }) }, executar)).toBe("ok");
    expect(banco.transacao).toHaveBeenCalledTimes(2);
    expect(banco.executores[0]).not.toBe(banco.executores[1]);
  });

  it("conflito PostgreSQL persistente é seguro e limitado", async () => {
    const banco = bancoSimulado();
    const executar = vi.fn().mockRejectedValue({ code: "40P01", message: "SQL interno" });
    await expect(transacaoAcademica(banco.db, { descobrir: async () => ({}) }, executar))
      .rejects.toBeInstanceOf(ConflitoAcademico);
    expect(banco.transacao).toHaveBeenCalledTimes(3);
  });

  it("erro de validação não é repetido ou escondido", async () => {
    const banco = bancoSimulado();
    const erro = new Error("nota inválida");
    await expect(transacaoAcademica(banco.db, { descobrir: async () => ({}) }, async () => { throw erro; }))
      .rejects.toBe(erro);
    expect(banco.transacao).toHaveBeenCalledTimes(1);
  });

  it("normaliza ordem da releitura sem reiniciar alvos equivalentes", async () => {
    const banco = bancoSimulado();
    let leitura = 0;
    await transacaoAcademica(banco.db, {
      descobrir: async () => ({ ofertas: ++leitura === 1 ? ["b", "a", "b"] : ["a", "b"] }),
    }, async () => undefined);
    expect(banco.transacao).toHaveBeenCalledTimes(1);
  });
});

describe("snapshot acadêmico", () => {
  it("rejeita transação já aberta antes de criar snapshot ou executar leitura", async () => {
    const banco = bancoSimulado();
    banco.db.isTransaction = true;
    const ler = vi.fn(async () => ["resultado"]);

    await expect(snapshotAcademico(banco.db, ler)).rejects.toThrow("transação já aberta");
    expect(banco.transacao).not.toHaveBeenCalled();
    expect(ler).not.toHaveBeenCalled();
    expect(banco.locks).toEqual([]);
  });

  it("compõe toda leitura num executor READ ONLY REPEATABLE READ", async () => {
    const banco = bancoSimulado();
    const ler = vi.fn(async (trx) => { expect(trx).toBe(banco.executores[0]); return ["resultado"]; });
    expect(await snapshotAcademico(banco.db, ler)).toEqual(["resultado"]);
    expect(banco.transacao).toHaveBeenCalledWith(ler, { isolationLevel: "repeatable read", readOnly: true });
    expect(banco.locks).toEqual([]);
  });
});

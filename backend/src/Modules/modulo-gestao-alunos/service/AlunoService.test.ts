import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { AlunoService } from "./AlunoService";
import { db } from "../../../database/connection";

function criar(overrides: Record<string, any> = {}) {
  const alunoRepository = {
    listarAlunos: async (filtros: any) => ["lista", filtros],
    buscarAlunoPorId: async (id: string) => ({ id }),
    buscarAlunoPorMatricula: async (_m: string) => ({ id: "a1" }),
    atualizarAluno: async (_m: string, data: any) => data,
    buscarAlunoPorCpfOuMatricula: async (q: string) => [q],
    ...overrides,
  };
  const service = new AlunoService();
  service.alunoRepository = alunoRepository as any;
  return { service, alunoRepository };
}

describe("AlunoService.buscarAlunoPorCpfOuMatricula", () => {
  it("rejeita consulta com menos de 3 caracteres", async () => {
    const { service } = criar();
    await assert.rejects(() => service.buscarAlunoPorCpfOuMatricula("ab"), /ao menos 3 caracteres/);
    await assert.rejects(() => service.buscarAlunoPorCpfOuMatricula("   "), /ao menos 3 caracteres/);
  });

  it("remove espacos antes de consultar o repositorio", async () => {
    let recebido: any;
    const { service } = criar({ buscarAlunoPorCpfOuMatricula: async (q: string) => ((recebido = q), []) });
    await service.buscarAlunoPorCpfOuMatricula("  12345  ");
    assert.equal(recebido, "12345");
  });
});

describe("AlunoService.atualizarAluno", () => {
  it("converte 'aluno nao encontrado' na mensagem generica de falha", async () => {
    const { service } = criar({ buscarAlunoPorMatricula: async () => null });
    await assert.rejects(() => service.atualizarAluno("999", {}), /Não foi possível atualizar o aluno/);
  });

  it("atualiza quando o aluno existe", async () => {
    const { service } = criar();
    assert.deepEqual(await service.atualizarAluno("1", { periodo: 2 }), { periodo: 2 });
  });
});

describe("AlunoService leitura", () => {
  it("repassa filtros ao listar", async () => {
    const { service } = criar();
    assert.deepEqual(await service.listarAlunos({ curso: "c1" }), ["lista", { curso: "c1" }]);
  });

  it("busca por id", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarAlunoPorId("a1"), { id: "a1" });
  });

  it("busca por matricula", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarAlunoPorMatricula("2024001"), { id: "a1" });
  });
});

function mockarTransaction(impl: (cb: any) => any) {
  Object.defineProperty(db, "transaction", { value: impl, writable: false, configurable: true });
}

describe("AlunoService.criarAluno", () => {
  const originalTransaction = db.transaction.bind(db);
  afterEach(() => {
    mockarTransaction(originalTransaction);
  });

  it("cria a pessoa e o aluno dentro de uma unica transacao", async () => {
    const trxFake = { fake: "trx" };
    mockarTransaction(async (cb: any) => cb(trxFake));

    const { service } = criar();
    let pessoaRecebida: any;
    let trxDaPessoa: any;
    service.pessoaRepository = {
      criarPessoa: async (pessoa: any, trx: any) => { pessoaRecebida = pessoa; trxDaPessoa = trx; return { id: "p1" }; },
    } as any;
    let alunoRecebido: any;
    let trxDoAluno: any;
    service.alunoRepository = {
      criarAluno: async (aluno: any, trx: any) => { alunoRecebido = aluno; trxDoAluno = trx; return { id: "a1", ...aluno }; },
    } as any;

    const payload = {
      id: "a1",
      usuarioId: "u1",
      periodo: 1,
      curso: "c1",
      pessoa: {
        cpf: "11111111111", nome: "Fulano", dataNascimento: "2000-01-01",
        logradouro: "Rua A", numero: "10", bairro: "Centro", cidadeIbge: "3652500", estado: "MG", cep: "36500000",
      },
    };

    const resultado = await service.criarAluno(payload);

    assert.equal(trxDaPessoa, trxFake);
    assert.equal(trxDoAluno, trxFake);
    assert.deepEqual(pessoaRecebida, {
      cpf: "11111111111", nome: "Fulano", data_nascimento: "2000-01-01",
      logradouro: "Rua A", numero: "10", bairro: "Centro", cidade_id: "3652500", estado: "MG", cep: "36500000",
    });
    assert.deepEqual(alunoRecebido, { id: "a1", pessoa_id: "p1", usuario_id: "u1", periodo: 1, curso_id: "c1" });
    assert.equal(resultado.id, "a1");
  });

  it("propaga o erro quando a criacao da pessoa falha, sem chamar o repositorio de aluno", async () => {
    mockarTransaction(async (cb: any) => cb({}));
    const { service } = criar();
    let chamouAluno = false;
    service.pessoaRepository = { criarPessoa: async () => { throw new Error("cpf duplicado"); } } as any;
    service.alunoRepository = { criarAluno: async () => { chamouAluno = true; return {}; } } as any;

    await assert.rejects(() => service.criarAluno({ pessoa: {} } as any), /cpf duplicado/);
    assert.equal(chamouAluno, false);
  });
});

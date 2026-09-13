import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { PessoaService } from "./PessoaService";

function criar(overrides: Record<string, any> = {}) {
  const repository = {
    criarPessoa: async (data: any) => data,
    listarPessoas: async () => [{ id: "p1" }],
    buscarPessoaPorId: async (id: string) => ({ id }),
    ...overrides,
  };
  const service = new PessoaService();
  service.pessoaRepository = repository as any;
  return { service, repository };
}

describe("PessoaService.criarPessoa", () => {
  it("gera id e converte dataNascimento/cidadeIbge para o formato do banco", async () => {
    let salvo: any;
    const { service } = criar({ criarPessoa: async (d: any) => ((salvo = d), d) });
    await service.criarPessoa({
      cpf: "00000000000", nome: "Fulano", dataNascimento: "2000-01-01",
      logradouro: "Rua A", numero: "1", bairro: "Centro",
      cidadeIbge: "3106200", estado: "MG", cep: "35000-000",
    });
    assert.ok(salvo.id);
    assert.equal(salvo.data_nascimento, "2000-01-01");
    assert.equal(salvo.cidade_id, "3106200");
  });
});

describe("PessoaService leitura", () => {
  it("lista pessoas", async () => {
    const { service } = criar();
    assert.deepEqual(await service.listarPessoas(), [{ id: "p1" }]);
  });

  it("busca pessoa por id", async () => {
    const { service } = criar();
    assert.deepEqual(await service.buscarPessoaPorId("p9"), { id: "p9" });
  });
});

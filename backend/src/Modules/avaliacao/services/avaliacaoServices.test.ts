import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { avaliacaoRepository } from "../repository/avaliacaoRepository.js";
import { avaliacaoService } from "./avaliacaoServices.js";
import type { Avaliacao, CriarAvaliacaoDTO } from "../models/avaliacaoModels.js";

const repositoryOriginal = { ...avaliacaoRepository };
const turmaDisciplinaId = "turma-disciplina-1";
const outraTurmaDisciplinaId = "turma-disciplina-999";

function criarAvaliacaoBase(overrides: Partial<Avaliacao> = {}): Avaliacao {
  return {
    id: "avaliacao-1",
    tipo_avaliacao: "PROVA",
    descricao_avaliacao: "Prova bimestral",
    data_lancamento: "2026-05-01",
    valor: 20,
    nota: null,
    data_devolucao: null,
    turma_disciplina_id: turmaDisciplinaId,
    matricula_turma_disciplina_id: null,
    ...overrides,
  };
}

function criarDTOBase(overrides: Partial<CriarAvaliacaoDTO> = {}): CriarAvaliacaoDTO {
  return {
    tipo_avaliacao: "PROVA",
    descricao_avaliacao: "Prova bimestral",
    data_lancamento: "2026-05-01",
    valor: 20,
    turma_disciplina_id: turmaDisciplinaId,
    ...overrides,
  };
}

describe("avaliacaoService", () => {
  beforeEach(() => {
    Object.assign(avaliacaoRepository, repositoryOriginal);

    avaliacaoRepository.buscarPorTurmaDisciplina = async () => [];
    avaliacaoRepository.criar = async (payload) =>
      criarAvaliacaoBase({ ...payload, id: "avaliacao-criada" });
  });

  afterEach(() => {
    Object.assign(avaliacaoRepository, repositoryOriginal);
  });

  describe("PROVA", () => {
    it("normaliza o valor de prova para 20 pontos ao criar", async () => {
      let payloadRecebido: any;

      avaliacaoRepository.criar = async (payload: any) => {
        payloadRecebido = payload;
        return criarAvaliacaoBase({ ...payload, id: "avaliacao-prova" });
      };

      const result = await avaliacaoService.criar(criarDTOBase({ valor: 1 }));

      assert.equal(payloadRecebido.valor, 20);
      assert.equal(result.valor, 20);
    });

    it("deve criar a 1a prova quando nao ha nenhuma cadastrada", async () => {
      const result = await avaliacaoService.criar(criarDTOBase());

      assert.equal(result.id, "avaliacao-criada");
    });

    it("deve criar a 2a prova quando ja existe 1", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "prova-1", tipo_avaliacao: "PROVA", valor: 20 }),
      ];

      const result = await avaliacaoService.criar(criarDTOBase());

      assert.equal(result.id, "avaliacao-criada");
    });

    it("deve criar a 3a prova quando ja existem 2", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "prova-1", tipo_avaliacao: "PROVA", valor: 20 }),
        criarAvaliacaoBase({ id: "prova-2", tipo_avaliacao: "PROVA", valor: 20 }),
      ];

      const result = await avaliacaoService.criar(criarDTOBase());

      assert.equal(result.id, "avaliacao-criada");
    });

    it("bloqueia a 4a prova da mesma turma/disciplina", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "prova-1", tipo_avaliacao: "PROVA", valor: 20 }),
        criarAvaliacaoBase({ id: "prova-2", tipo_avaliacao: "PROVA", valor: 20 }),
        criarAvaliacaoBase({ id: "prova-3", tipo_avaliacao: "PROVA", valor: 20 }),
      ];

      await assert.rejects(
        () => avaliacaoService.criar(criarDTOBase({ descricao_avaliacao: "Prova final" })),
        /Ja existem 3 provas/,
      );
    });

    it("nao deve contar provas de outra turma/disciplina no limite", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({
          id: "prova-1",
          tipo_avaliacao: "PROVA",
          turma_disciplina_id: outraTurmaDisciplinaId,
        }),
        criarAvaliacaoBase({
          id: "prova-2",
          tipo_avaliacao: "PROVA",
          turma_disciplina_id: outraTurmaDisciplinaId,
        }),
        criarAvaliacaoBase({
          id: "prova-3",
          tipo_avaliacao: "PROVA",
          turma_disciplina_id: outraTurmaDisciplinaId,
        }),
      ];

      const result = await avaliacaoService.criar(criarDTOBase());

      assert.equal(result.id, "avaliacao-criada");
    });
  });

  describe("TPI", () => {
    function criarDTOTpi(overrides: Partial<CriarAvaliacaoDTO> = {}): CriarAvaliacaoDTO {
      return criarDTOBase({
        tipo_avaliacao: "TPI",
        descricao_avaliacao: "TPI",
        valor: 5,
        ...overrides,
      });
    }

    it("deve criar TPI quando nao ha nenhum cadastrado", async () => {
      const result = await avaliacaoService.criar(criarDTOTpi());

      assert.equal(result.id, "avaliacao-criada");
      assert.equal(result.valor, 5);
    });

    it("deve rejeitar segundo TPI na mesma turma/disciplina", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "tpi-1", tipo_avaliacao: "TPI", valor: 5 }),
      ];

      await assert.rejects(
        () => avaliacaoService.criar(criarDTOTpi()),
        /Ja existe um TPI/,
      );
    });

    it("nao deve contar TPI de outra turma/disciplina no limite", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({
          id: "tpi-1",
          tipo_avaliacao: "TPI",
          valor: 5,
          turma_disciplina_id: outraTurmaDisciplinaId,
        }),
      ];

      const result = await avaliacaoService.criar(criarDTOTpi());

      assert.equal(result.id, "avaliacao-criada");
    });
  });

  describe("TRABALHO", () => {
    function criarDTOTrabalho(valor: number): CriarAvaliacaoDTO {
      return criarDTOBase({
        tipo_avaliacao: "TRABALHO",
        descricao_avaliacao: "Trabalho",
        valor,
      });
    }

    it("deve criar trabalho quando a soma nao ultrapassa 25", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "trab-1", tipo_avaliacao: "TRABALHO", valor: 10 }),
      ];

      const result = await avaliacaoService.criar(criarDTOTrabalho(10));

      assert.equal(result.id, "avaliacao-criada");
    });

    it("deve criar trabalho que leva a soma exatamente a 25", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "trab-1", tipo_avaliacao: "TRABALHO", valor: 15 }),
      ];

      const result = await avaliacaoService.criar(criarDTOTrabalho(10));

      assert.equal(result.id, "avaliacao-criada");
    });

    it("deve rejeitar trabalho que ultrapassa 25 pontos", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({ id: "trab-1", tipo_avaliacao: "TRABALHO", valor: 20 }),
      ];

      await assert.rejects(
        () => avaliacaoService.criar(criarDTOTrabalho(10)),
        /trabalhos podem somar no maximo 25/,
      );
    });

    it("deve rejeitar trabalho isolado com valor maior que 25", async () => {
      await assert.rejects(
        () => avaliacaoService.criar(criarDTOTrabalho(30)),
        /trabalhos podem somar no maximo 25/,
      );
    });

    it("nao deve somar trabalhos de outra turma/disciplina no limite", async () => {
      avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
        criarAvaliacaoBase({
          id: "trab-1",
          tipo_avaliacao: "TRABALHO",
          valor: 25,
          turma_disciplina_id: outraTurmaDisciplinaId,
        }),
      ];

      const result = await avaliacaoService.criar(criarDTOTrabalho(10));

      assert.equal(result.id, "avaliacao-criada");
    });
  });

  it("deve aceitar criar PROVA mesmo havendo TPI e TRABALHO cadastrados", async () => {
    avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
      criarAvaliacaoBase({ id: "tpi-1", tipo_avaliacao: "TPI", valor: 5 }),
      criarAvaliacaoBase({ id: "trab-1", tipo_avaliacao: "TRABALHO", valor: 15 }),
    ];

    const result = await avaliacaoService.criar(criarDTOBase());

    assert.equal(result.id, "avaliacao-criada");
  });

  it("exige turma_disciplina_id no payload", async () => {
    await assert.rejects(
      () =>
        avaliacaoService.criar(
          criarDTOBase({ tipo_avaliacao: "TRABALHO", valor: 5, turma_disciplina_id: "" }),
        ),
      /turma_disciplina_id/,
    );
  });
});

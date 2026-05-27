import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { avaliacaoRepository } from "../repository/avaliacaoRepository.js";
import { avaliacaoService } from "./avaliacaoServices.js";
import type { Avaliacao } from "../models/avaliacaoModels.js";

const repositoryOriginal = { ...avaliacaoRepository };

const baseAvaliacao: Avaliacao = {
  id: "avaliacao-1",
  tipo_avaliacao: "TRABALHO",
  descricao_avaliacao: "Trabalho",
  data_lancamento: "2026-05-01",
  valor: 10,
  data_devolucao: null,
  turma_disciplina_id: "turma-disciplina-1",
  matricula_turma_disciplina_id: null,
};

describe("avaliacaoService", () => {
  beforeEach(() => {
    Object.assign(avaliacaoRepository, repositoryOriginal);
  });

  afterEach(() => {
    Object.assign(avaliacaoRepository, repositoryOriginal);
  });

  it("normaliza o valor de prova para 20 pontos ao criar", async () => {
    let payloadRecebido: any;

    avaliacaoRepository.buscarPorTurmaDisciplina = async () => [];
    avaliacaoRepository.criar = async (payload: any) => {
      payloadRecebido = payload;
      return { ...baseAvaliacao, ...payload, id: "avaliacao-prova" };
    };

    const result = await avaliacaoService.criar({
      tipo_avaliacao: "PROVA",
      descricao_avaliacao: "Prova bimestral",
      data_lancamento: "2026-05-01",
      valor: 1,
      turma_disciplina_id: "turma-disciplina-1",
    });

    assert.equal(payloadRecebido.valor, 20);
    assert.equal(result.valor, 20);
  });

  it("bloqueia a quarta prova da mesma turma/disciplina", async () => {
    avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
      { ...baseAvaliacao, id: "prova-1", tipo_avaliacao: "PROVA", valor: 20 },
      { ...baseAvaliacao, id: "prova-2", tipo_avaliacao: "PROVA", valor: 20 },
      { ...baseAvaliacao, id: "prova-3", tipo_avaliacao: "PROVA", valor: 20 },
    ];

    await assert.rejects(
      () =>
        avaliacaoService.criar({
          tipo_avaliacao: "PROVA",
          descricao_avaliacao: "Prova final",
          data_lancamento: "2026-05-01",
          valor: 20,
          turma_disciplina_id: "turma-disciplina-1",
        }),
      /Ja existem 3 provas/,
    );
  });

  it("valida o limite de 25 pontos para trabalhos por turma/disciplina", async () => {
    avaliacaoRepository.buscarPorTurmaDisciplina = async () => [
      { ...baseAvaliacao, id: "trab-1", tipo_avaliacao: "TRABALHO", valor: 15 },
      { ...baseAvaliacao, id: "trab-2", tipo_avaliacao: "TRABALHO", valor: 10 },
    ];

    await assert.rejects(
      () =>
        avaliacaoService.criar({
          tipo_avaliacao: "TRABALHO",
          descricao_avaliacao: "Seminario",
          data_lancamento: "2026-05-01",
          valor: 1,
          turma_disciplina_id: "turma-disciplina-1",
        }),
      /trabalhos podem somar no maximo 25/,
    );
  });

  it("exige turma_disciplina_id no payload", async () => {
    await assert.rejects(
      () =>
        avaliacaoService.criar({
          tipo_avaliacao: "TRABALHO",
          descricao_avaliacao: "Seminario",
          data_lancamento: "2026-05-01",
          valor: 5,
          turma_disciplina_id: "",
        }),
      /turma_disciplina_id/,
    );
  });
});

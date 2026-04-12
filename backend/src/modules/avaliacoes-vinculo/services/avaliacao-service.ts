import type { Avaliacao, AvaliacaoPayload, TipoAvaliacao } from "../models/interface.js";
import { AvaliacaoRepository } from "../repository/avaliacao-repository.js";

const MAX_PROVAS = 3;
const VALOR_PROVA = 20;
const VALOR_TPI = 5;
const LIMITE_TRABALHOS = 25;

export class AvaliacaoService {
  async listar(): Promise<Avaliacao[]> {
    return AvaliacaoRepository.buscarTodas();
  }

  async criar(dados: AvaliacaoPayload): Promise<Avaliacao | undefined> {
    const payload = this.normalizarPayload(dados);
    this.validarDados(payload);

    const avaliacoes = await AvaliacaoRepository.buscarTodas();
    this.validarRegrasDePontuacao(payload, avaliacoes);

    return AvaliacaoRepository.criar(payload);
  }

  async atualizar(id: number, dados: Partial<AvaliacaoPayload>): Promise<Avaliacao | undefined> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Id invalido");
    }

    const atual = await AvaliacaoRepository.buscarPorId(id);
    if (!atual) {
      return undefined;
    }

    const payload = this.normalizarPayload({ ...atual, ...dados });
    this.validarDados(payload);

    const avaliacoes = await AvaliacaoRepository.buscarTodas();
    this.validarRegrasDePontuacao(payload, avaliacoes, id);

    return AvaliacaoRepository.atualizar(id, payload);
  }

  async deletar(id: number): Promise<boolean> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Id invalido");
    }

    const deleted = await AvaliacaoRepository.deletar(id);
    return deleted > 0;
  }

  private normalizarPayload(dados: AvaliacaoPayload): AvaliacaoPayload {
    const payload: AvaliacaoPayload = {
      ...dados,
      descricao_avaliacao: dados.descricao_avaliacao?.trim() || undefined,
      texto_tarefa: dados.texto_tarefa?.trim() || undefined,
      data_devolucao_avaliacao: dados.data_devolucao_avaliacao || null,
    };

    if (payload.tipo_avaliacao === "PROVA") {
      payload.valor_avaliacao = VALOR_PROVA;
    }

    if (payload.tipo_avaliacao === "TPI") {
      payload.valor_avaliacao = VALOR_TPI;
    }

    return payload;
  }

  private validarDados(dados: AvaliacaoPayload) {
    const tiposPermitidos: TipoAvaliacao[] = ["PROVA", "TPI", "TRABALHO"];

    if (!tiposPermitidos.includes(dados.tipo_avaliacao)) {
      throw new Error("Tipo de avaliacao invalido. Use: PROVA, TPI ou TRABALHO.");
    }

    if (typeof dados.id_disciplina !== "number" || dados.id_disciplina <= 0) {
      throw new Error("Disciplina invalida.");
    }

    if (
      typeof dados.valor_avaliacao !== "number" ||
      Number.isNaN(dados.valor_avaliacao) ||
      dados.valor_avaliacao <= 0
    ) {
      throw new Error("Valor da avaliacao invalido.");
    }

    if (!dados.data_avaliacao || Number.isNaN(Date.parse(dados.data_avaliacao))) {
      throw new Error("Data da avaliacao invalida.");
    }

    if (
      dados.data_devolucao_avaliacao !== undefined &&
      dados.data_devolucao_avaliacao !== null &&
      Number.isNaN(Date.parse(dados.data_devolucao_avaliacao))
    ) {
      throw new Error("Data de devolucao da avaliacao invalida.");
    }
  }

  private validarRegrasDePontuacao(
    candidato: AvaliacaoPayload,
    avaliacoes: Avaliacao[],
    idAtual?: number,
  ) {
    const outrasAvaliacoes = avaliacoes.filter((avaliacao) => avaliacao.id_avaliacao !== idAtual);

    const provas = outrasAvaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "PROVA");
    const tpis = outrasAvaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "TPI");
    const trabalhos = outrasAvaliacoes.filter((avaliacao) => avaliacao.tipo_avaliacao === "TRABALHO");

    if (candidato.tipo_avaliacao === "PROVA") {
      if (provas.length >= MAX_PROVAS) {
        throw new Error("Ja existem 3 provas cadastradas de 20 pontos.");
      }

      if (candidato.valor_avaliacao !== VALOR_PROVA) {
        throw new Error("Cada prova deve valer exatamente 20 pontos.");
      }
    }

    if (candidato.tipo_avaliacao === "TPI") {
      if (tpis.length >= 1) {
        throw new Error("Ja existe um TPI cadastrado de 5 pontos.");
      }

      if (candidato.valor_avaliacao !== VALOR_TPI) {
        throw new Error("O TPI deve valer exatamente 5 pontos.");
      }
    }

    if (candidato.tipo_avaliacao === "TRABALHO") {
      const totalTrabalhos = trabalhos.reduce(
        (total, avaliacao) => total + Number(avaliacao.valor_avaliacao),
        0,
      );

      if (totalTrabalhos + candidato.valor_avaliacao > LIMITE_TRABALHOS) {
        throw new Error("Os trabalhos podem somar no maximo 25 pontos.");
      }
    }
  }
}


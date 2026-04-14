import { avaliacaoRepository } from '../repository/avaliacaoRepository.js';
import type { Avaliacao, CriarAvaliacaoDTO, AtualizarAvaliacaoDTO, TipoAvaliacao } from '../models/avaliacaoModels.js';

const MAX_PROVAS = 3;
const VALOR_PROVA = 20;
const VALOR_TPI = 5;
const LIMITE_TRABALHOS = 25;

function normalizarPayload(dados: CriarAvaliacaoDTO): CriarAvaliacaoDTO {
  const payload: CriarAvaliacaoDTO = {
    ...dados,
    descricao_avaliacao: dados.descricao_avaliacao?.trim() || "",
    data_devolucao: dados.data_devolucao || null,
  };

  if (payload.tipo_avaliacao === 'PROVA') {
    payload.valor = VALOR_PROVA;
  }

  if (payload.tipo_avaliacao === 'TPI') {
    payload.valor = VALOR_TPI;
  }

  return payload;
}

function validarDados(dados: CriarAvaliacaoDTO): void {
  const tiposPermitidos: TipoAvaliacao[] = ['PROVA', 'TPI', 'TRABALHO'];

  if (!tiposPermitidos.includes(dados.tipo_avaliacao)) {
    throw new Error('Tipo de avaliação inválido. Use: PROVA, TPI ou TRABALHO.');
  }

  if (!dados.turma_id) {
    throw new Error('O campo turma_id é obrigatório.');
  }

  if (typeof dados.valor !== 'number' || Number.isNaN(dados.valor) || dados.valor <= 0) {
    throw new Error('Valor da avaliação inválido.');
  }

  if (!dados.data_lancamento || Number.isNaN(Date.parse(String(dados.data_lancamento)))) {
    throw new Error('Data de lançamento da avaliação inválida.');
  }

  if (
    dados.data_devolucao !== undefined &&
    dados.data_devolucao !== null &&
    Number.isNaN(Date.parse(String(dados.data_devolucao)))
  ) {
    throw new Error('Data de devolução da avaliação inválida.');
  }
}

function validarRegrasDePontuacao(
  candidato: CriarAvaliacaoDTO,
  avaliacoes: Avaliacao[],
  idAtual?: string,
): void {
  const outrasAvaliacoes = avaliacoes.filter((av) => av.id !== idAtual);
  const provas = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === 'PROVA');
  const tpis = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === 'TPI');
  const trabalhos = outrasAvaliacoes.filter((av) => av.tipo_avaliacao === 'TRABALHO');

  if (candidato.tipo_avaliacao === 'PROVA') {
    if (provas.length >= MAX_PROVAS) {
      throw new Error('Já existem 3 provas cadastradas de 20 pontos.');
    }
    if (candidato.valor !== VALOR_PROVA) {
      throw new Error('Cada prova deve valer exatamente 20 pontos.');
    }
  }

  if (candidato.tipo_avaliacao === 'TPI') {
    if (tpis.length >= 1) {
      throw new Error('Já existe um TPI cadastrado de 5 pontos.');
    }
    if (candidato.valor !== VALOR_TPI) {
      throw new Error('O TPI deve valer exatamente 5 pontos.');
    }
  }

  if (candidato.tipo_avaliacao === 'TRABALHO') {
    const totalTrabalhos = trabalhos.reduce((total, av) => total + Number(av.valor), 0);
    if (totalTrabalhos + candidato.valor > LIMITE_TRABALHOS) {
      throw new Error('Os trabalhos podem somar no máximo 25 pontos.');
    }
  }
}

async function listar(): Promise<Avaliacao[]> {
  return await avaliacaoRepository.buscarTodas();
}

async function buscarPorId(id: string): Promise<Avaliacao> {
  const avaliacao = await avaliacaoRepository.buscarPorId(id);
  if (!avaliacao) {
    throw new Error('Avaliação não encontrada.');
  }
  return avaliacao;
}

async function criar(dados: CriarAvaliacaoDTO): Promise<Avaliacao> {
  const payload = normalizarPayload(dados);
  validarDados(payload);

  const avaliacoes = await avaliacaoRepository.buscarTodas();
  validarRegrasDePontuacao(payload, avaliacoes);

  return await avaliacaoRepository.criar(payload);
}

async function atualizar(id: string, dados: AtualizarAvaliacaoDTO): Promise<Avaliacao> {
  const atual = await avaliacaoRepository.buscarPorId(id);
  if (!atual) {
    throw new Error('Avaliação não encontrada.');
  }

  const merged: CriarAvaliacaoDTO = {
    tipo_avaliacao: dados.tipo_avaliacao ?? atual.tipo_avaliacao,
    descricao_avaliacao: (dados.descricao_avaliacao ?? atual.descricao_avaliacao ?? "") as string,
    data_lancamento: dados.data_lancamento ?? atual.data_lancamento,
    valor: dados.valor ?? atual.valor,
    nota: (dados.nota ?? atual.nota ?? 0) as number,
    data_devolucao: dados.data_devolucao !== undefined ? dados.data_devolucao : (atual.data_devolucao || null),
    aluno_turma_id: dados.aluno_turma_id !== undefined ? dados.aluno_turma_id : (atual.aluno_turma_id || null),
    turma_id: dados.turma_id ?? atual.turma_id,
  };

  const payload = normalizarPayload(merged);
  validarDados(payload);

  const avaliacoes = await avaliacaoRepository.buscarTodas();
  validarRegrasDePontuacao(payload, avaliacoes, id);

  const atualizada = await avaliacaoRepository.atualizar(id, payload);
  if (!atualizada) {
    throw new Error('Avaliação não encontrada.');
  }
  return atualizada;
}

async function deletar(id: string): Promise<void> {
  const avaliacao = await avaliacaoRepository.buscarPorId(id);
  if (!avaliacao) {
    throw new Error('Avaliação não encontrada.');
  }
  await avaliacaoRepository.deletar(id);
}

export const avaliacaoService = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
};

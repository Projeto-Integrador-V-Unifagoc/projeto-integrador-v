import type { Request, Response } from 'express';
import { avaliacaoService } from '../services/avaliacaoServices.js';

async function listarTodos(req: Request, res: Response): Promise<void> {
  try {
    const avaliacoes = await avaliacaoService.listar();
    res.status(200).json(avaliacoes);
  } catch (erro: any) {
    res.status(500).json({ mensagem: 'Erro ao listar avaliações.', erro: erro.message });
  }
}

async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    // Garantindo que id seja tratado como string
    const id = String(req.params.id);

    if (!id || id === 'undefined') {
      res.status(400).json({ mensagem: 'ID inválido.' });
      return;
    }

    const avaliacao = await avaliacaoService.buscarPorId(id);
    res.status(200).json(avaliacao);
  } catch (erro: any) {
    if (erro.message === 'Avaliação não encontrada.') {
      res.status(404).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao buscar avaliação.', erro: erro.message });
    }
  }
}

async function criar(req: Request, res: Response): Promise<void> {
  try {
    const { tipo_avaliacao, descricao_avaliacao, data_lancamento, valor, nota, data_devolucao, matricula_turma_disciplina_id, turma_disciplina_id } = req.body;

    if (!tipo_avaliacao || !data_lancamento || !turma_disciplina_id) {
      res.status(400).json({ mensagem: 'Os campos tipo_avaliacao, data_lancamento e turma_disciplina_id são obrigatórios.' });
      return;
    }

    const novaAvaliacao = await avaliacaoService.criar({
      tipo_avaliacao,
      descricao_avaliacao: descricao_avaliacao || "", // Resolve o erro de undefined vs string
      data_lancamento,
      valor,
      nota,
      data_devolucao,
      matricula_turma_disciplina_id,
      turma_disciplina_id,
    });

    res.status(201).json(novaAvaliacao);
  } catch (erro: any) {
    if (
      erro.message.includes('Já existem 3 provas') ||
      erro.message.includes('Já existe um TPI') ||
      erro.message.includes('Os trabalhos podem somar') ||
      erro.message.includes('inválido') ||
      erro.message.includes('obrigatório')
    ) {
      res.status(400).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao criar avaliação.', erro: erro.message });
    }
  }
}

async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    // Garantindo que id seja string para satisfazer o service
    const id = String(req.params.id);

    if (!id || id === 'undefined') {
      res.status(400).json({ mensagem: 'ID inválido.' });
      return;
    }

    const { tipo_avaliacao, descricao_avaliacao, data_lancamento, valor, nota, data_devolucao, matricula_turma_disciplina_id, turma_disciplina_id } = req.body;

    const dadosParaAtualizar = Object.fromEntries(
      Object.entries({ tipo_avaliacao, descricao_avaliacao, data_lancamento, valor, nota, data_devolucao, matricula_turma_disciplina_id, turma_disciplina_id }).filter(
        ([_, v]) => v !== undefined,
      ),
    );

    if (Object.keys(dadosParaAtualizar).length === 0) {
      res.status(400).json({ mensagem: 'Nenhum campo enviado para atualização.' });
      return;
    }

    const avaliacaoAtualizada = await avaliacaoService.atualizar(id, dadosParaAtualizar);
    res.status(200).json(avaliacaoAtualizada);
  } catch (erro: any) {
    if (erro.message === 'Avaliação não encontrada.') {
      res.status(404).json({ mensagem: erro.message });
    } else if (
      erro.message.includes('Já existem 3 provas') ||
      erro.message.includes('Já existe um TPI') ||
      erro.message.includes('Os trabalhos podem somar') ||
      erro.message.includes('inválido') ||
      erro.message.includes('obrigatório')
    ) {
      res.status(400).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao atualizar avaliação.', erro: erro.message });
    }
  }
}

async function deletar(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id || id === 'undefined') {
      res.status(400).json({ mensagem: 'ID inválido.' });
      return;
    }

    await avaliacaoService.deletar(id);
    res.status(204).send();
  } catch (erro: any) {
    if (erro.message === 'Avaliação não encontrada.') {
      res.status(404).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao deletar avaliação.', erro: erro.message });
    }
  }
}

export const avaliacaoController = {
  listarTodos,
  buscarPorId,
  criar,
  atualizar,
  deletar,
};
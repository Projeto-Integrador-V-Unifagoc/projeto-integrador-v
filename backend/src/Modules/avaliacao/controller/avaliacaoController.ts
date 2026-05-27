import type { Request, Response } from "express";
import { avaliacaoService } from "../services/avaliacaoServices.js";

function isErroValidacao(mensagem: string) {
  return (
    mensagem.includes("Ja existem 3 provas") ||
    mensagem.includes("Ja existe um TPI") ||
    mensagem.includes("Os trabalhos podem somar") ||
    mensagem.includes("invalido") ||
    mensagem.includes("invalida") ||
    mensagem.includes("obrigatorio")
  );
}

async function listarTodos(req: Request, res: Response): Promise<void> {
  try {
    const avaliacoes = await avaliacaoService.listar();
    res.status(200).json(avaliacoes);
  } catch (erro: any) {
    res.status(500).json({ mensagem: "Erro ao listar avaliacoes.", erro: erro.message });
  }
}

async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id || id === "undefined") {
      res.status(400).json({ mensagem: "ID invalido." });
      return;
    }

    const avaliacao = await avaliacaoService.buscarPorId(id);
    res.status(200).json(avaliacao);
  } catch (erro: any) {
    if (erro.message === "Avaliacao nao encontrada.") {
      res.status(404).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: "Erro ao buscar avaliacao.", erro: erro.message });
    }
  }
}

async function criar(req: Request, res: Response): Promise<void> {
  try {
    const {
      tipo_avaliacao,
      descricao_avaliacao,
      data_lancamento,
      valor,
      nota,
      data_devolucao,
      turma_disciplina_id,
      matricula_turma_disciplina_id,
    } = req.body;

    if (!tipo_avaliacao || !data_lancamento || !turma_disciplina_id) {
      res.status(400).json({
        mensagem:
          "Os campos tipo_avaliacao, data_lancamento e turma_disciplina_id sao obrigatorios.",
      });
      return;
    }

    const novaAvaliacao = await avaliacaoService.criar({
      tipo_avaliacao,
      descricao_avaliacao: descricao_avaliacao || "",
      data_lancamento,
      valor: Number(valor),
      nota,
      data_devolucao,
      turma_disciplina_id,
      matricula_turma_disciplina_id,
    });

    res.status(201).json(novaAvaliacao);
  } catch (erro: any) {
    if (isErroValidacao(erro.message)) {
      res.status(400).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: "Erro ao criar avaliacao.", erro: erro.message });
    }
  }
}

async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id || id === "undefined") {
      res.status(400).json({ mensagem: "ID invalido." });
      return;
    }

    const {
      tipo_avaliacao,
      descricao_avaliacao,
      data_lancamento,
      valor,
      nota,
      data_devolucao,
      turma_disciplina_id,
      matricula_turma_disciplina_id,
    } = req.body;

    const dadosParaAtualizar = Object.fromEntries(
      Object.entries({
        tipo_avaliacao,
        descricao_avaliacao,
        data_lancamento,
        valor: valor !== undefined ? Number(valor) : undefined,
        nota,
        data_devolucao,
        turma_disciplina_id,
        matricula_turma_disciplina_id,
      }).filter(([, v]) => v !== undefined),
    );

    if (Object.keys(dadosParaAtualizar).length === 0) {
      res.status(400).json({ mensagem: "Nenhum campo enviado para atualizacao." });
      return;
    }

    const avaliacaoAtualizada = await avaliacaoService.atualizar(id, dadosParaAtualizar);
    res.status(200).json(avaliacaoAtualizada);
  } catch (erro: any) {
    if (erro.message === "Avaliacao nao encontrada.") {
      res.status(404).json({ mensagem: erro.message });
    } else if (isErroValidacao(erro.message)) {
      res.status(400).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: "Erro ao atualizar avaliacao.", erro: erro.message });
    }
  }
}

async function deletar(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id || id === "undefined") {
      res.status(400).json({ mensagem: "ID invalido." });
      return;
    }

    await avaliacaoService.deletar(id);
    res.status(204).send();
  } catch (erro: any) {
    if (erro.message === "Avaliacao nao encontrada.") {
      res.status(404).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: "Erro ao deletar avaliacao.", erro: erro.message });
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

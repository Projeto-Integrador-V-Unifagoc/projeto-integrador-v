import type { Request, Response } from 'express';
import { professorService } from '../services/professorServices.js';

async function listarTodos(req: Request, res: Response): Promise<void> {
  try {
    const professores = await professorService.listarTodos();
    res.status(200).json(professores);
  } catch (erro: any) {
    res.status(500).json({ mensagem: 'Erro ao listar professores.', erro: erro.message });
  }
}

async function buscarPorId(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id) {
      res.status(400).json({ mensagem: 'ID inválido.' });
      return;
    }

    const professor = await professorService.buscarPorId(id);
    res.status(200).json(professor);
  } catch (erro: any) {
    if (erro.message === 'Professor não encontrado.') {
      res.status(404).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao buscar professor.', erro: erro.message });
    }
  }
}

async function criar(req: Request, res: Response): Promise<void> {
  try {
    const {
      nome,
      email,
      senha,
      cpf,
      data_nascimento,
      logradouro,
      numero,
      bairro,
      cidade_id,
      estado,
      cep,
      curso_id,
      faculdade_id,
    } = req.body;

    // Validar campos obrigatórios
    if (!nome || !email || !senha || !cpf) {
      res.status(400).json({
        mensagem: 'Os campos nome, email, senha e cpf são obrigatórios.',
      });
      return;
    }

    const novoProfessor = await professorService.criar({
      nome,
      email,
      senha,
      cpf,
      data_nascimento,
      logradouro,
      numero,
      bairro,
      cidade_id,
      estado,
      cep,
      curso_id,
      faculdade_id,
    });

    res.status(201).json(novoProfessor);
  } catch (erro: any) {
    if (erro.message.includes('Já existe um professor')) {
      res.status(409).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao criar professor.', erro: erro.message });
    }
  }
}

async function atualizar(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id) {
      res.status(400).json({ mensagem: 'ID inválido.' });
      return;
    }

    const {
      nome,
      email,
      senha,
      cpf,
      data_nascimento,
      logradouro,
      numero,
      bairro,
      cidade_id,
      estado,
      cep,
      curso_id,
      faculdade_id,
    } = req.body;

    const dadosParaAtualizar = Object.fromEntries(
      Object.entries({
        nome,
        email,
        senha,
        cpf,
        data_nascimento,
        logradouro,
        numero,
        bairro,
        cidade_id,
        estado,
        cep,
        curso_id,
        faculdade_id,
      }).filter(([_, valor]) => valor !== undefined)
    );

    if (Object.keys(dadosParaAtualizar).length === 0) {
      res.status(400).json({ mensagem: 'Nenhum campo enviado para atualização.' });
      return;
    }

    const professorAtualizado = await professorService.atualizar(id, dadosParaAtualizar);
    res.status(200).json(professorAtualizado);
  } catch (erro: any) {
    if (erro.message === 'Professor não encontrado.') {
      res.status(404).json({ mensagem: erro.message });
    } else if (erro.message.includes('Já existe um professor')) {
      res.status(409).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao atualizar professor.', erro: erro.message });
    }
  }
}

async function remover(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id) {
      res.status(400).json({ mensagem: 'ID inválido.' });
      return;
    }

    await professorService.remover(id);
    res.status(204).send();
  } catch (erro: any) {
    if (erro.message === 'Professor não encontrado.') {
      res.status(404).json({ mensagem: erro.message });
    } else {
      res.status(500).json({ mensagem: 'Erro ao remover professor.', erro: erro.message });
    }
  }
}

export const professorController = {
  listarTodos,
  buscarPorId,
  criar,
  atualizar,
  remover,
};

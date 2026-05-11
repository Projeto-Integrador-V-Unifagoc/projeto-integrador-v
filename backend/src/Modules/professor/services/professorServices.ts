import { professorRepository } from '../repository/professorRepository.js';
import type { AtualizarProfessor, CriarProfessorDTO } from '../models/professorModels.js';

async function listarTodos() {
  return await professorRepository.listarTodos();
}

async function buscarPorId(id: string) {
  const professor = await professorRepository.buscarPorId(id);
  if (!professor) {
    throw new Error('Professor não encontrado.');
  }
  return professor;
}

async function criar(dados: CriarProfessorDTO) {
  const emailExistente = await professorRepository.buscarPorEmail(dados.email);
  if (emailExistente) {
    throw new Error('Já existe um professor cadastrado com este e-mail.');
  }

  const cpfExistente = await professorRepository.buscarPorCpf(dados.cpf);
  if (cpfExistente) {
    throw new Error('Já existe um professor cadastrado com este CPF.');
  }

  return await professorRepository.criar(dados);
}

async function atualizar(id: string, dados: AtualizarProfessor) {
  const professor = await professorRepository.buscarPorId(id);

  if (!professor) {
    throw new Error('Professor não encontrado.');
  }

  if (dados.email !== undefined) {
    const emailExistente = await professorRepository.buscarPorEmail(dados.email);
    if (emailExistente && emailExistente.id !== id) {
      throw new Error('Já existe um professor cadastrado com este e-mail.');
    }
  }

  if (dados.cpf !== undefined) {
    const cpfExistente = await professorRepository.buscarPorCpf(dados.cpf);
    if (cpfExistente && cpfExistente.id !== id) {
      throw new Error('Já existe um professor cadastrado com este CPF.');
    }
  }

  return await professorRepository.atualizar(id, dados);
}

async function remover(id: string) {
  const professor = await professorRepository.buscarPorId(id);
  if (!professor) {
    throw new Error('Professor não encontrado.');
  }
  await professorRepository.remover(id);
}

export const professorService = {
  listarTodos,
  buscarPorId,
  criar,
  atualizar,
  remover,
};
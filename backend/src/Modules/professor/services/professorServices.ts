import { professorRepository } from '../repository/professorRepository.js';
import type { AtualizarProfessor } from '../models/professorModels.js';
import type { Professor } from '../models/professorModels.js';

async function atualizar(id: number, dados: AtualizarProfessor): Promise<Professor> {
  const professor = await professorRepository.buscarPorId(id);

  if (!professor) {
    throw new Error('Professor não encontrado.');
  }

  if (dados.email) {
    const emailExistente = await professorRepository.buscarPorEmail(dados.email);
    if (emailExistente && emailExistente.id !== id) {
      throw new Error('Já existe um professor cadastrado com este e-mail.');
    }
  }

  if (dados.cpf) {
    const cpfExistente = await professorRepository.buscarPorCpf(dados.cpf);
    if (cpfExistente && cpfExistente.id !== id) {
      throw new Error('Já existe um professor cadastrado com este CPF.');
    }
  }

  return await professorRepository.atualizar(id, dados);
}

export const professorService = {
  atualizar,
  listarTodos: async (): Promise<Professor[]> => [],
  buscarPorId: async (id: number): Promise<Professor> => ({ id, nome: '', email: '', senha: '', cpf: '' }),
  criar: async (dados: Professor): Promise<Professor> => dados,
  remover: async (id: number): Promise<void> => {},
};
import type { Professor, AtualizarProfessor } from '../models/professorModels.js';export const professorRepository = {
  
  buscarPorId: async (id: number): Promise<Professor | undefined> => undefined,
  buscarPorEmail: async (email: string): Promise<Professor | undefined> => undefined,
  buscarPorCpf: async (cpf: string): Promise<Professor | undefined> => undefined,
  atualizar: async (id: number, dados: AtualizarProfessor): Promise<Professor> => ({ ...dados, id, nome: '', email: '', senha: '', cpf: '' }),
};
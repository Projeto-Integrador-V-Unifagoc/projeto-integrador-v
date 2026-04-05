import api from './conexao-api';
import type { Usuario } from '../models/usuario';

export const authService = {
  // Função para cadastrar (Tarefa do Felipe Junior)
  async cadastrar(dados: Usuario) {
    const response = await api.post('/usuarios', dados);
    return response.data;
  },

  // Função para login (Tarefa do Gabriel Silva)
  async login(email: string, senha: string) {
    const response = await api.post('/login', { email, senha });
    return response.data; // Aqui deve vir o Token JWT que você configurou!
  }
};
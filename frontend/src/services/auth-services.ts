import api from './conexao-api';
import type { Usuario } from '../models/usuario';

export const authService = {
  async cadastrar(dados: Usuario) {
    const response = await api.post('/cadastro', dados); 
    return response.data;
  },

  async login(dados: Pick<Usuario, 'email' | 'senha'>) {
    const response = await api.post('/login', dados);
    return response.data;
  },

  async getMe(token: string) {
    const response = await api.get('/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};
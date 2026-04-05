import api from './conexao-api';
import type { Usuario } from '../models/usuario';

export const authService = {
  async cadastrar(dados: any) {
    const response = await api.post('/usuarios', dados); // Ou '/cadastro'
    return response.data;
  },

  async login(dados: any) {
    const response = await api.post('http://localhost:3000/login', dados);
    return response.data;
  }

};
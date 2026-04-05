import api from './conexao-api';
import type { Usuario } from '../models/usuario';

export const authService = {
  async cadastrar(dados: any) {
  // ERRO PROVÁVEL: Se aqui estiver '/login', ele vai dar erro de login 
  // mesmo que você chame a função 'cadastrar' no React.
    const response = await api.post('/usuarios', dados); // Ou '/cadastro'
    return response.data;
  },

  // Função para login (Tarefa do Gabriel Silva)
  // Mude de (email, senha) para (dados: any)
  async login(dados: any) {
    // Usando a URL completa para garantir que ele saia da porta 5173 e vá para a 3000
    const response = await api.post('http://localhost:3000/login', dados);
    return response.data;
  }

};
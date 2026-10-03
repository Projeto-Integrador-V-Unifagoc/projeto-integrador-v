import api from './conexao-api';
import { executarRecaptcha } from './recaptcha';
import type { Usuario } from '../models/usuario';

interface DadosRedefinicaoSenha {
  token: string;
  novaSenha: string;
  confirmarSenha: string;
}

export const authService = {
  async cadastrar(dados: Usuario) {
    const response = await api.post('/cadastro', dados); 
    return response.data;
  },

  async login(dados: Pick<Usuario, 'email' | 'senha'>) {
    const response = await api.post('/login', { ...dados, recaptchaToken: await executarRecaptcha() });
    return response.data;
  },

  async getMe(token: string) {
    const response = await api.get('/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  async solicitarRecuperacaoSenha(email: string) {
    const response = await api.post('/recuperacao-senha', {
      email,
      recaptchaToken: await executarRecaptcha(),
    });

    return response.data;
  },

  async redefinirSenha(dados: DadosRedefinicaoSenha) {
    const response = await api.post(
      '/redefinir-senha',
      dados
    );

    return response.data;
  },
};

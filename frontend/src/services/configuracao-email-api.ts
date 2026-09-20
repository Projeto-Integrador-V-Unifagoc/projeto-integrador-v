import { api } from "../lib/axios";

export type ChaveDisparador =
  | "inscricao_recebida"
  | "documentacao_aprovada"
  | "recuperacao_senha";

export interface ConfiguracaoEmail {
  id: string;
  chave: ChaveDisparador;
  nome: string;
  descricao: string;
  ativo: boolean;
  remetente_nome: string;
  remetente_email: string;
  assunto: string;
  titulo: string;
  mensagem: string;
}

export interface AtualizarConfiguracaoEmail {
  ativo?: boolean;
  remetente_nome?: string;
  remetente_email?: string;
  assunto?: string;
  titulo?: string;
  mensagem?: string;
}

export interface ConfiguracaoSmtp {
  host: string;
  porta: number;
  seguro: boolean;
  usuario: string;
  remetente_nome: string;
  remetente_email: string;
  ativo: boolean;
  senha_definida: boolean;
  modo_teste: boolean;
  testado_em: string | null;
  resultado_teste: string;
}

export interface SalvarSmtp {
  host: string;
  porta: number;
  seguro: boolean;
  usuario: string;
  senha?: string;
  remetente_nome: string;
  remetente_email: string;
  ativo: boolean;
}

export interface ResultadoTeste {
  sucesso: boolean;
  mensagem: string;
}

export interface EmailRemetente {
  id: string;
  email: string;
  nome: string;
}

export const configuracaoEmailApi = {
  async listar(): Promise<ConfiguracaoEmail[]> {
    const response = await api.get<ConfiguracaoEmail[]>("/configuracoes/email");
    return response.data;
  },

  async atualizar(
    chave: ChaveDisparador,
    dados: AtualizarConfiguracaoEmail,
  ): Promise<ConfiguracaoEmail> {
    const response = await api.patch<ConfiguracaoEmail>(`/configuracoes/email/${chave}`, dados);
    return response.data;
  },

  async buscarSmtp(): Promise<ConfiguracaoSmtp> {
    const response = await api.get<ConfiguracaoSmtp>("/configuracoes/email/smtp");
    return response.data;
  },

  async salvarSmtp(dados: SalvarSmtp): Promise<ConfiguracaoSmtp> {
    const response = await api.put<ConfiguracaoSmtp>("/configuracoes/email/smtp", dados);
    return response.data;
  },

  async testarConexao(): Promise<ResultadoTeste> {
    const response = await api.post<ResultadoTeste>("/configuracoes/email/smtp/testar-conexao");
    return response.data;
  },

  async enviarTeste(chave: ChaveDisparador, destinatario: string): Promise<ResultadoTeste> {
    const response = await api.post<ResultadoTeste>(`/configuracoes/email/${chave}/enviar-teste`, {
      destinatario,
    });
    return response.data;
  },

  async listarRemetentes(): Promise<EmailRemetente[]> {
    const response = await api.get<EmailRemetente[]>("/configuracoes/email/remetentes");
    return response.data;
  },

  async adicionarRemetente(email: string, nome: string): Promise<EmailRemetente[]> {
    const response = await api.post<EmailRemetente[]>("/configuracoes/email/remetentes", { email, nome });
    return response.data;
  },

  async removerRemetente(id: string): Promise<EmailRemetente[]> {
    const response = await api.delete<EmailRemetente[]>(`/configuracoes/email/remetentes/${id}`);
    return response.data;
  },
};

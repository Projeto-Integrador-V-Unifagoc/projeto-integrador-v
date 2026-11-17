import { api } from "../lib/axios";

export type ProvedorIa = "anthropic" | "openai" | "google";

export const PROVEDORES_IA: { valor: ProvedorIa; rotulo: string }[] = [
  { valor: "anthropic", rotulo: "Anthropic (Claude)" },
  { valor: "openai", rotulo: "OpenAI" },
  { valor: "google", rotulo: "Google (Gemini)" },
];

export interface ConfiguracaoIa {
  provedor: ProvedorIa;
  modelo: string;
  modeloSugerido: Record<ProvedorIa, string>;
  modelosDisponiveis: Record<ProvedorIa, { valor: string; rotulo: string }[]>;
  possuiChave: boolean;
  chaveFinal: string;
  ativo: boolean;
  testadoEm: string | null;
  resultadoTeste: string;
}

export interface SalvarConfiguracaoIa {
  provedor: ProvedorIa;
  modelo: string;
  apiKey?: string;
  ativo: boolean;
}

export interface MensagemAssistente {
  papel: "usuario" | "assistente";
  texto: string;
}

/**
 * Ação de um botão de IA das telas. O frontend manda só o tipo e os identificadores;
 * a instrução para o modelo é montada no backend (AcoesAssistente.ts).
 */
export type AcaoAssistente =
  | { tipo: "entender_desempenho"; turmaDisciplinaId: string }
  | { tipo: "orientacoes" }
  | { tipo: "analisar_aluno"; turmaDisciplinaId: string; alunoId: string };

export const assistenteApi = {
  async status(): Promise<{ ativo: boolean }> {
    return (await api.get("/assistente/status")).data;
  },

  async enviar(mensagem: string, historico: MensagemAssistente[], acao?: AcaoAssistente): Promise<{ resposta: string }> {
    return (await api.post("/assistente/mensagens", { mensagem, historico, ...(acao ? { acao } : {}) })).data;
  },

  async buscarConfiguracao(): Promise<ConfiguracaoIa> {
    return (await api.get("/assistente/configuracao")).data;
  },

  async salvarConfiguracao(dados: SalvarConfiguracaoIa): Promise<ConfiguracaoIa> {
    return (await api.put("/assistente/configuracao", dados)).data;
  },

  async testarConexao(): Promise<{ sucesso: boolean; mensagem: string }> {
    return (await api.post("/assistente/configuracao/testar")).data;
  },
};

import axios from "axios";
import { api } from "../lib/axios";
import type { ErroRegraPontuacao, RegraPontuacao, SalvarRegraPontuacaoRequest } from "../models/regra-pontuacao-model";

function caminho(cursoId: string, periodoLetivoId: string): string {
  return `/regras-pontuacao/cursos/${encodeURIComponent(cursoId)}/periodos/${encodeURIComponent(periodoLetivoId)}`;
}

export const regraPontuacaoApi = {
  async buscarRegra(cursoId: string, periodoLetivoId: string): Promise<RegraPontuacao | null> {
    try {
      const resposta = await api.get<RegraPontuacao>(caminho(cursoId, periodoLetivoId));
      return resposta.data;
    } catch (erro: unknown) {
      if (axios.isAxiosError<ErroRegraPontuacao>(erro)
        && erro.response?.status === 404 && erro.response.data?.codigo === "REGRA_AUSENTE") return null;
      throw erro;
    }
  },

  async salvarRegra(cursoId: string, periodoLetivoId: string, payload: SalvarRegraPontuacaoRequest): Promise<RegraPontuacao> {
    const resposta = await api.put<RegraPontuacao>(caminho(cursoId, periodoLetivoId), payload);
    return resposta.data;
  },
};

import { useCallback, useState } from "react";
import { regraPontuacaoApi } from "../services/regra-pontuacao-api";
import type { SalvarRegraPontuacaoRequest } from "../models/regra-pontuacao-model";

export function useRegraPontuacao() {
  const [requisicoes, setRequisicoes] = useState(0);

  const buscarRegra = useCallback(async (cursoId: string, periodoLetivoId: string) => {
    setRequisicoes((quantidade) => quantidade + 1);
    try {
      return await regraPontuacaoApi.buscarRegra(cursoId, periodoLetivoId);
    } finally {
      setRequisicoes((quantidade) => quantidade - 1);
    }
  }, []);

  const salvarRegra = useCallback(async (cursoId: string, periodoLetivoId: string, payload: SalvarRegraPontuacaoRequest) => {
    setRequisicoes((quantidade) => quantidade + 1);
    try {
      return await regraPontuacaoApi.salvarRegra(cursoId, periodoLetivoId, payload);
    } finally {
      setRequisicoes((quantidade) => quantidade - 1);
    }
  }, []);

  return { carregando: requisicoes > 0, buscarRegra, salvarRegra };
}

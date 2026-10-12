import { useCallback, useState } from "react";
import { notaApi } from "../services/nota-api";
import type { ItemLoteNota } from "../models/nota-model";

export function useNota() {
  const [pendentes, setPendentes] = useState(0);

  const executar = useCallback(async <T,>(acao: () => Promise<T>): Promise<T> => {
    setPendentes((total) => total + 1);
    try {
      return await acao();
    } finally {
      setPendentes((total) => total - 1);
    }
  }, []);

  const listarOpcoes = useCallback(() => executar(() => notaApi.listarOpcoes()), [executar]);
  const obterLancamento = useCallback((id: string) => executar(() => notaApi.obterLancamento(id)), [executar]);
  const salvarLote = useCallback((id: string, itens: ItemLoteNota[], motivo?: string) => executar(() => notaApi.salvarLote(id, itens, motivo)), [executar]);
  const obterRendimento = useCallback((id: string) => executar(() => notaApi.obterRendimento(id)), [executar]);
  const obterRecuperacao = useCallback((id: string) => executar(() => notaApi.obterRecuperacao(id)), [executar]);
  const criarAutorizacao = useCallback((dados: { avaliacaoId: string; matriculaTurmaDisciplinaId?: string; motivo: string; prazoEmDias?: number }) => executar(() => notaApi.criarAutorizacao(dados)), [executar]);
  const meuBoletim = useCallback((id?: string) => executar(() => notaApi.meuBoletim(id)), [executar]);
  const meuResumo = useCallback(() => executar(() => notaApi.meuResumo()), [executar]);
  const consultarAluno = useCallback((id: string) => executar(() => notaApi.consultarAluno(id)), [executar]);

  return {
    carregando: pendentes > 0,
    listarOpcoes, obterLancamento, salvarLote, obterRendimento, obterRecuperacao,
    criarAutorizacao, meuBoletim, meuResumo, consultarAluno,
  };
}

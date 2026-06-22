import { useState } from "react";
import { notaApi } from "../services/nota-api";
import type { ItemLoteNota } from "../models/nota-model";

export function useNota() {
  const [carregando, setCarregando] = useState(false);

  const executar = async <T>(acao: () => Promise<T>): Promise<T> => {
    setCarregando(true);
    try {
      return await acao();
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    listarOpcoes: () => executar(() => notaApi.listarOpcoes()),
    obterLancamento: (avaliacaoId: string) => executar(() => notaApi.obterLancamento(avaliacaoId)),
    salvarLote: (avaliacaoId: string, itens: ItemLoteNota[], motivo?: string) =>
      executar(() => notaApi.salvarLote(avaliacaoId, itens, motivo)),
    obterRendimento: (turmaDisciplinaId: string) => executar(() => notaApi.obterRendimento(turmaDisciplinaId)),
    obterRecuperacao: (turmaDisciplinaId: string) => executar(() => notaApi.obterRecuperacao(turmaDisciplinaId)),
    criarAutorizacao: (dados: { avaliacaoId: string; matriculaTurmaDisciplinaId?: string; motivo: string; prazoEmDias?: number }) =>
      executar(() => notaApi.criarAutorizacao(dados)),
    meuBoletim: (periodoId?: string) => executar(() => notaApi.meuBoletim(periodoId)),
    meuResumo: () => executar(() => notaApi.meuResumo()),
    consultarAluno: (alunoId: string) => executar(() => notaApi.consultarAluno(alunoId)),
  };
}

import { useState } from "react";
import { frequenciaApi } from "../services/frequencia-api";
import type { RegistrarFrequenciaPayload, StatusFrequencia } from "../models/frequencia-model";

export function useFrequencia() {
  const [carregando, setCarregando] = useState(false);

  async function executar<T>(callback: () => Promise<T>) {
    setCarregando(true);
    try {
      return await callback();
    } finally {
      setCarregando(false);
    }
  }

  return {
    carregando,
    listarOpcoes: () => executar(() => frequenciaApi.listarOpcoes()),
    obterChamada: (params: { turmaId: string; data: string }) => executar(() => frequenciaApi.obterChamada(params)),
    registrarFrequencia: (data: RegistrarFrequenciaPayload) => executar(() => frequenciaApi.registrarFrequencia(data)),
    editarFrequencia: (id: string, status: StatusFrequencia) => executar(() => frequenciaApi.editarFrequencia(id, status)),
    removerFrequencia: (id: string) => executar(() => frequenciaApi.removerFrequencia(id)),
    consultarAluno: (alunoId: string) => executar(() => frequenciaApi.consultarAluno(alunoId)),
    registrarJustificativa: (id: string, justificativa: string) => executar(() => frequenciaApi.registrarJustificativa(id, justificativa)),
    gerarRelatorio: (params: { turmaId: string; dataInicio?: string; dataFim?: string }) => executar(() => frequenciaApi.gerarRelatorio(params)),
  };
}

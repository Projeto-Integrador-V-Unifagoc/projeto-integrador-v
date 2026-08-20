import { useState } from "react";
import { frequenciaApi } from "../services/frequencia-api";
export function useFrequencia() {
  const [operacoes, setOperacoes] = useState<Record<string, boolean>>({});
  async function executar<T>(nome: string, fn: () => Promise<T>) { setOperacoes((s) => ({ ...s, [nome]: true })); try { return await fn(); } finally { setOperacoes((s) => ({ ...s, [nome]: false })); } }
  return { operacoes,
    listarOpcoes: () => executar("opcoes", frequenciaApi.listarOpcoes),
    obterChamada: (p: Parameters<typeof frequenciaApi.obterChamada>[0]) => executar("chamada", () => frequenciaApi.obterChamada(p)),
    salvarChamada: (p: Parameters<typeof frequenciaApi.salvarChamada>[0]) => executar("salvamento", () => frequenciaApi.salvarChamada(p)),
    consultarAluno: (id: string) => executar("consulta", () => frequenciaApi.consultarAluno(id)),
    minhaFrequencia: () => executar("consulta", frequenciaApi.minhaFrequencia),
    justificar: (id: string, d: Parameters<typeof frequenciaApi.justificar>[1]) => executar("justificativa", () => frequenciaApi.justificar(id, d)),
    gerarRelatorio: (p: Parameters<typeof frequenciaApi.gerarRelatorio>[0]) => executar("relatorio", () => frequenciaApi.gerarRelatorio(p)),
  };
}

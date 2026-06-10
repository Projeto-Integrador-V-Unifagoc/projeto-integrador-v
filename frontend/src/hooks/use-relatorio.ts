import { useCallback, useState } from "react";
import type { FiltrosRelatorios, RelatorioItem } from "../models/relatorio-model";
import { relatorioApi } from "../services/relatorio-api";

export function useRelatorio() {
  const [carregando, setCarregando] = useState(false);

  const listarRelatorios = useCallback(async (filtros: FiltrosRelatorios): Promise<RelatorioItem[]> => {
    setCarregando(true);

    try {
      return await relatorioApi.listarRelatorios(filtros);
    } finally {
      setCarregando(false);
    }
  }, []);

  return {
    listarRelatorios,
    carregando,
  };
}

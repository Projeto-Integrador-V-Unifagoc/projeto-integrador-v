import { useState } from "react";
import { periodoLetivoApi } from "../services/periodo-letivo-api";
import type { PeriodoLetivoRequest } from "../models/periodo-letivo-model";

export function usePeriodoLetivo() {
  const [carregando, setCarregando] = useState(false);

  const listarPeriodosLetivos = async () => {
    setCarregando(true);

    try {
      return await periodoLetivoApi.listarPeriodosLetivos();
    } finally {
      setCarregando(false);
    }
  };

  const buscarPeriodoLetivoPorId = async (id: string) => {
    setCarregando(true);

    try {
      return await periodoLetivoApi.buscarPeriodoLetivoPorId(id);
    } finally {
      setCarregando(false);
    }
  };

  const criarPeriodoLetivo = async (data: PeriodoLetivoRequest) => {
    setCarregando(true);

    try {
      return await periodoLetivoApi.criarPeriodoLetivo(data);
    } finally {
      setCarregando(false);
    }
  };

  const atualizarPeriodoLetivo = async (id: string, data: PeriodoLetivoRequest) => {
    setCarregando(true);

    try {
      return await periodoLetivoApi.atualizarPeriodoLetivo(id, data);
    } finally {
      setCarregando(false);
    }
  };

  const removerPeriodoLetivo = async (id: string) => {
    setCarregando(true);

    try {
      return await periodoLetivoApi.removerPeriodoLetivo(id);
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    listarPeriodosLetivos,
    buscarPeriodoLetivoPorId,
    criarPeriodoLetivo,
    atualizarPeriodoLetivo,
    removerPeriodoLetivo,
  };
}

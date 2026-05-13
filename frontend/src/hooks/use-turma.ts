import { useState } from "react";
import { turmaApi } from "../services/turma-api";
import type { TurmaDisciplinaRequest, TurmaRequest } from "../models/turma-model";

export function useTurma() {
  const [carregando, setCarregando] = useState(false);

  const listarTurmas = async () => {
    setCarregando(true);

    try {
      return await turmaApi.listarTurmas();
    } finally {
      setCarregando(false);
    }
  };

  const buscarTurmaPorId = async (id: string) => {
    setCarregando(true);

    try {
      return await turmaApi.buscarTurmaPorId(id);
    } finally {
      setCarregando(false);
    }
  };

  const criarTurma = async (data: TurmaRequest) => {
    setCarregando(true);

    try {
      return await turmaApi.criarTurma(data);
    } finally {
      setCarregando(false);
    }
  };

  const atualizarTurma = async (id: string, data: TurmaRequest) => {
    setCarregando(true);

    try {
      return await turmaApi.atualizarTurma(id, data);
    } finally {
      setCarregando(false);
    }
  };

  const removerTurma = async (id: string) => {
    setCarregando(true);

    try {
      return await turmaApi.removerTurma(id);
    } finally {
      setCarregando(false);
    }
  };

  const listarDisciplinasDaTurma = async (id: string) => {
    setCarregando(true);

    try {
      return await turmaApi.listarDisciplinasDaTurma(id);
    } finally {
      setCarregando(false);
    }
  };

  const criarDisciplinaDaTurma = async (id: string, data: TurmaDisciplinaRequest) => {
    setCarregando(true);

    try {
      return await turmaApi.criarDisciplinaDaTurma(id, data);
    } finally {
      setCarregando(false);
    }
  };

  const atualizarDisciplinaDaTurma = async (id: string, turmaDisciplinaId: string, data: TurmaDisciplinaRequest) => {
    setCarregando(true);

    try {
      return await turmaApi.atualizarDisciplinaDaTurma(id, turmaDisciplinaId, data);
    } finally {
      setCarregando(false);
    }
  };

  const removerDisciplinaDaTurma = async (id: string, turmaDisciplinaId: string) => {
    setCarregando(true);

    try {
      return await turmaApi.removerDisciplinaDaTurma(id, turmaDisciplinaId);
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    listarTurmas,
    buscarTurmaPorId,
    criarTurma,
    atualizarTurma,
    removerTurma,
    listarDisciplinasDaTurma,
    criarDisciplinaDaTurma,
    atualizarDisciplinaDaTurma,
    removerDisciplinaDaTurma,
  };
}

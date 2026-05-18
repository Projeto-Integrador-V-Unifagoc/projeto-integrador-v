import { useState } from "react";
import { cursoDisciplinaApi } from "../services/curso-disciplina-api";
import type { AtualizarCursoDisciplinaRequest, CursoDisciplinaRequest } from "../models/curso-disciplina-model";

export function useCursoDisciplina() {
  const [carregando, setCarregando] = useState(false);

  const listarCursoDisciplinas = async () => {
    setCarregando(true);

    try {
      return await cursoDisciplinaApi.listarCursoDisciplinas();
    } finally {
      setCarregando(false);
    }
  };

  const listarMatrizCurricularPorCursoId = async (cursoId: string) => {
    setCarregando(true);

    try {
      return await cursoDisciplinaApi.listarMatrizCurricularPorCursoId(cursoId);
    } finally {
      setCarregando(false);
    }
  };

  const criarCursoDisciplina = async (data: CursoDisciplinaRequest) => {
    setCarregando(true);

    try {
      return await cursoDisciplinaApi.criarCursoDisciplina(data);
    } finally {
      setCarregando(false);
    }
  };

  const atualizarCursoDisciplina = async (id: string, data: AtualizarCursoDisciplinaRequest) => {
    setCarregando(true);

    try {
      return await cursoDisciplinaApi.atualizarCursoDisciplina(id, data);
    } finally {
      setCarregando(false);
    }
  };

  const removerCursoDisciplina = async (id: string) => {
    setCarregando(true);

    try {
      return await cursoDisciplinaApi.removerCursoDisciplina(id);
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    listarCursoDisciplinas,
    listarMatrizCurricularPorCursoId,
    criarCursoDisciplina,
    atualizarCursoDisciplina,
    removerCursoDisciplina,
  };
}

import { useState } from "react";
import { cursoApi } from "../services/curso-api";
import type { CriarCursoRequest } from "../models/curso-model";

export function useCurso() {
  const [carregando, setCarregando] = useState(false)

  const listarCursos = async () => {
    setCarregando(true)

    try {
      return await cursoApi.listarCursos()
    } finally {
      setCarregando(false)
    }
  }

  const buscarCursoPorId = async (id: string) => {
    setCarregando(true)

    try {
      return await cursoApi.buscarCursoPorId(id)
    } finally {
      setCarregando(false)
    }
  }

  const criarCurso = async (data: CriarCursoRequest) => {
    setCarregando(true)

    try {
      return await cursoApi.criarCurso(data)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarCurso = async (id: string, data: CriarCursoRequest) => {
    setCarregando(true)

    try {
      return await cursoApi.atualizarCurso(id, data)
    } finally {
      setCarregando(false)
    }
  }

  const removerCurso = async (id: string) => {
    setCarregando(true)

    try {
      return await cursoApi.removerCurso(id)
    } finally {
      setCarregando(false)
    }
  }

  return {
    carregando,
    listarCursos,
    buscarCursoPorId,
    criarCurso,
    atualizarCurso,
    removerCurso,
  }
}

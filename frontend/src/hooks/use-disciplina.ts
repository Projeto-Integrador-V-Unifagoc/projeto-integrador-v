import { useState } from "react";
import { disciplinaApi } from "../services/disciplina-api";
import type { CriarDisciplinaRequest } from "../models/disciplina-model";

export function useDisciplina() {
  const [carregando, setCarregando] = useState(false)

  const listarDisciplinas = async () => {
    setCarregando(true)

    try {
      return await disciplinaApi.listarDisciplinas()
    } finally {
      setCarregando(false)
    }
  }

  const buscarDisciplinaPorId = async (id: string) => {
    setCarregando(true)

    try {
      return await disciplinaApi.buscarDisciplinaPorId(id)
    } finally {
      setCarregando(false)
    }
  }

  const criarDisciplina = async (data: CriarDisciplinaRequest) => {
    setCarregando(true)

    try {
      return await disciplinaApi.criarDisciplina(data)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarDisciplina = async (id: string, data: CriarDisciplinaRequest) => {
    setCarregando(true)

    try {
      return await disciplinaApi.atualizarDisciplina(id, data)
    } finally {
      setCarregando(false)
    }
  }

  const removerDisciplina = async (id: string) => {
    setCarregando(true)

    try {
      return await disciplinaApi.removerDisciplina(id)
    } finally {
      setCarregando(false)
    }
  }

  return {
    carregando,
    listarDisciplinas,
    buscarDisciplinaPorId,
    criarDisciplina,
    atualizarDisciplina,
    removerDisciplina,
  }
}

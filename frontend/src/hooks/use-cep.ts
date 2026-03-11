import { useState } from "react"

import type { ViaCepModel } from "../models/via-cep-model"
import api from "../services/cep-api"

export function useViaCep() {
  const [carregando, setCarregando] = useState(false)

  async function buscarCep(cep: string): Promise<ViaCepModel | null> {

    const cepLimpo = cep.replace(/\D/g, "")

    if (cepLimpo.length !== 8) return null

    try {
      setCarregando(true)

      const response = await api.get<ViaCepModel>(`/${cepLimpo}/json`)

      return response.data

    } catch (error) {
      console.error("Erro ao buscar CEP", error)
      return null
    } finally {
      setCarregando(false)
    }
  }

  return {
    buscarCep,
    carregando
  }
}
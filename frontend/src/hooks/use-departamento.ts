import { useState } from "react";
import { departamentoApi } from "../services/departamento-api";

export function useDepartamento() {
  const [carregando, setCarregando] = useState(false)

  const listarDepartamentos = async () => {
    setCarregando(true)

    try {
      return await departamentoApi.listarDepartamentos()
    } finally {
      setCarregando(false)
    }
  }

  return {
    carregando,
    listarDepartamentos,
  }
}

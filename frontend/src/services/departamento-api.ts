import { api } from "../lib/axios"

export const departamentoApi = {
  async listarDepartamentos() {
    const response = await api.get("/departamentos")
    return response.data
  },
}

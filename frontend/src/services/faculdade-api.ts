import { api } from "../lib/axios"

export const faculdadeApi = {
  async listarFaculdades() {
    const response = await api.get("/faculdades")
    return response.data
  },
}

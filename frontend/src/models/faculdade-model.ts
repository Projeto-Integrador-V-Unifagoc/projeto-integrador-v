export interface FaculdadeResponse {
  id: string
  nome: string
  cidade?: {
    id: string
    ibge: string
    nome: string
    uf: string
  }
}

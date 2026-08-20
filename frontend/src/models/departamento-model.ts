export interface DepartamentoResponse {
  id: string
  codigo: string
  nome: string
  faculdade: {
    id: string
    nome: string
  }
}

export interface ProfessorResponse {
  id: string
  nome: string
  curso?: {
    id: string
    nome: string
  }
}

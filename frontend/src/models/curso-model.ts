export interface CursoResponse {
  id: string
  codigo: string
  nome: string
  departamento: {
    id: string
    codigo: string
    nome: string
    faculdade: {
      id: string
      nome: string
      cidade: {
        nome: string
        uf: string
      }
    }
  }
}

export interface CriarCursoRequest {
  codigo: string
  nome: string
  departamentoId: string
}

export interface CursoView {
  id: string
  codigo: string
  nome: string
  departamento: string
  faculdade: string
}

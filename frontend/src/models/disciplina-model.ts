export interface DisciplinaResponse {
  id: string
  codigo: string
  nome: string
  carga_horaria: number
  pre_requisito?: string
  curso: {
    id: string
    codigo: string
    nome: string
  }
}

export interface CriarDisciplinaRequest {
  codigo: string
  nome: string
  cursoId: string
  cargaHoraria: number
  preRequisito?: string
}

export interface DisciplinaView {
  id: string
  codigo: string
  nome: string
  curso: string
  cargaHoraria: number
  preRequisito?: string
}

export interface DisciplinaResponse {
  id: string
  codigo: string
  nome: string
  carga_horaria: number
  pre_requisito?: string
  ativo: boolean
}

export interface CriarDisciplinaRequest {
  codigo: string
  nome: string
  cargaHoraria: number
  preRequisito?: string
  ativo?: boolean
}

export interface DisciplinaView {
  id: string
  codigo: string
  nome: string
  cargaHoraria: number
  preRequisito?: string
  ativo: boolean
}

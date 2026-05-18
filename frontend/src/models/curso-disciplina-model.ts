export interface CursoDisciplinaResponse {
  id: string
  periodo_ideal?: number
  obrigatoria: boolean
  carga_horaria: number
  ativo: boolean
  curso: {
    id: string
    codigo: string
    nome: string
  }
  disciplina: {
    id: string
    codigo: string
    nome: string
    pre_requisito?: string
    carga_horaria: number
    ativo: boolean
  }
}

export interface CursoDisciplinaRequest {
  cursoId: string
  disciplinaId: string
  periodoIdeal?: number
  obrigatoria: boolean
  cargaHoraria: number
  ativo?: boolean
}

export interface AtualizarCursoDisciplinaRequest {
  periodoIdeal?: number
  obrigatoria?: boolean
  cargaHoraria?: number
  ativo?: boolean
}

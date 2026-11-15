export interface CursoDisciplinaResponse {
  id: string
  periodo_ideal?: number
  obrigatoria: boolean
  carga_horaria: number
  ativo: boolean
  matriz_curricular: {
    id: string
    codigo: string
    versao: string
    status: StatusMatrizCurricular
  }
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
  matrizCurricularId: string
  disciplinaId: string
  periodoIdeal?: number
  obrigatoria: boolean
  cargaHoraria: number
  ativo?: boolean
}

export type StatusMatrizCurricular = "RASCUNHO" | "VIGENTE" | "ENCERRADA"

export interface MatrizCurricularResponse {
  id: string
  curso_id: string
  codigo: string
  versao: string
  status: StatusMatrizCurricular
  vigencia_inicio: string
  vigencia_fim: string | null
  publicada_em: string | null
  total_disciplinas: number
  carga_horaria_total: number
  total_turmas: number
}

export interface CriarMatrizCurricularRequest {
  codigo: string
  versao: string
  vigenciaInicio: string
  matrizOrigemId?: string
}

export interface AtualizarCursoDisciplinaRequest {
  periodoIdeal?: number
  obrigatoria?: boolean
  cargaHoraria?: number
  ativo?: boolean
}

export interface PeriodoLetivoResponse {
  id: string
  codigo: string
  ano: number
  semestre: number
  data_inicio: string
  data_fim: string
  ativo: boolean
  status: string
}

export interface PeriodoLetivoRequest {
  codigo: string
  ano: number
  semestre: number
  dataInicio: string
  dataFim: string
  ativo?: boolean
  status: string
}

export interface PeriodoLetivoView {
  id: string
  codigo: string
  semestre: string
  inicio: string
  fim: string
  status: string
  ativo: boolean
}

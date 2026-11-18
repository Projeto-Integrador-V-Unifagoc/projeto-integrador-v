export interface TurmaResponse {
  id: string
  periodo_curricular: number
  descricao: string
  sigla: string
  capacidade_alunos: number
  turno: string
  status: string
  periodo_letivo: {
    id: string
    codigo: string
    ano: number
    semestre: number
    data_inicio: string
    data_fim: string
  }
  curso: {
    id: string
    codigo: string
    nome: string
  }
  matriz_curricular: {
    id: string
    codigo: string
    versao: string
    status: string
  }
}

export interface TurmaRequest {
  periodoLetivoId: string
  cursoId: string
  periodoCurricular: number
  descricao: string
  sigla: string
  capacidadeAlunos: number
  turno: string
  status: string
}

export interface TurmaDisciplinaResponse {
  id: string
  status: string
  turma: {
    id: string
    sigla: string
    descricao: string
  }
  curso_disciplina: {
    id: string
    periodo_ideal?: number
    obrigatoria: boolean
    carga_horaria: number
    disciplina: {
      id: string
      codigo: string
      nome: string
      pre_requisito?: string
      carga_horaria: number
    }
  }
  professor: {
    id: string
    nome: string
  }
}

export interface TurmaDisciplinaRequest {
  cursoDisciplinaId: string
  professorId: string
  status?: string
}

export interface HorarioOfertaResponse {
  id: string
  turma_disciplina_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  local: string | null
  vigencia_inicio: string
  vigencia_fim: string
  ativo: boolean
  turma_sigla: string
  disciplina_codigo: string
  disciplina_nome: string
  professor_nome: string
  periodo_inicio: string
  periodo_fim: string
}

export interface HorarioOfertaRequest {
  diaSemana: number
  horaInicio: string
  horaFim: string
  local?: string
  vigenciaInicio: string
  vigenciaFim: string
  ativo?: boolean
}

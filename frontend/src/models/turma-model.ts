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
  }
  curso: {
    id: string
    codigo: string
    nome: string
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

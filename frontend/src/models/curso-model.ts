export interface CursoResponse {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  grau_academico: string | null
  modalidade: string | null
  duracao_periodos: number | null
  carga_horaria_minima: number | null
  situacao_academica: "ATIVO" | "INATIVO" | "EM_EXTINCAO"
  ato_regulatorio: string | null
  observacoes_regulatorias: string | null
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
  descricao: string
  grauAcademico: string
  modalidade: string
  duracaoPeriodos: number | string
  cargaHorariaMinima: number | string
  situacaoAcademica: string
  atoRegulatorio?: string
  observacoesRegulatorias?: string
}

export interface CursoView {
  id: string
  codigo: string
  nome: string
  departamento: string
  faculdade: string
  modalidade: string
  grauAcademico: string
  situacaoAcademica: string
}

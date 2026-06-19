export type PerfilRelatorio = "Professor" | "Aluno" | "Secretaria";
export type TipoUsuarioRelatorio = "aluno" | "professor" | "secretaria" | "administrador";
export type TipoRelatorio = "Notas" | "Frequencia" | "Consulta" | "Historico";
export type SituacaoAcademica =
  | "Aprovado"
  | "Recuperacao"
  | "Pendente"
  | "Regular"
  | "Atencao";

export interface FiltrosRelatorioAcademico {
  perfil?: PerfilRelatorio;
  busca?: string;
  ano?: string;
  tipo?: string;
  alunoId?: string;
  matricula?: string;
  cursoId?: string;
  turmaId?: string;
  turmaIdsPermitidos?: string[];
  disciplinaId?: string;
}

export interface ContextoRelatorioAcademico {
  usuarioId: string;
  tipoUsuario: TipoUsuarioRelatorio;
}

export interface RelatorioAcademicoLinha {
  alunoId: string;
  matricula: number | string;
  aluno: string;
  cursoId?: string;
  curso: string;
  periodo: string;
  turmaId?: string;
  disciplinaId?: string;
  disciplina: string;
  cargaHoraria: number;
  ano: string;
  nota?: number | string | null;
  frequencia?: number | string | null;
  totalAulas?: number;
  presencas?: number;
  faltas?: number;
  situacao?: SituacaoAcademica | string | null;
}

export interface DisciplinaRelatorio {
  nome: string;
  aluno?: string;
  cargaHoraria: string;
  nota?: string;
  frequencia?: string;
  totalAulas?: string;
  presencas?: string;
  faltas?: string;
  situacao: SituacaoAcademica;
}

export interface PeriodoRelatorio {
  nome: string;
  disciplinas: DisciplinaRelatorio[];
}

export interface RelatorioLinhaPdf {
  [key: string]: string;
}

export interface RelatorioPdf {
  titulo: string;
  universidade: string;
  rodape: string;
  colunas: string[];
  larguras: number[];
  linhas: RelatorioLinhaPdf[];
}

export interface RelatorioItem {
  id: number;
  nome: string;
  descricao: string;
  tipo: TipoRelatorio;
  ano: string;
  perfis: PerfilRelatorio[];
  curso: string;
  matrizCurricular: string;
  periodos: PeriodoRelatorio[];
  pdf: RelatorioPdf;
}

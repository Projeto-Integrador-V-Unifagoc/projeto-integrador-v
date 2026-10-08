import type { ResultadoAcademico } from "../../notas/models/ResultadoAcademico";

export type PerfilRelatorio = "Professor" | "Aluno" | "Secretaria";
export type TipoUsuarioRelatorio = "aluno" | "professor" | "secretaria" | "administrador";
export type TipoRelatorio = "Notas" | "Frequencia" | "Consulta" | "Historico";
export type SituacaoAcademica =
  | "Aprovado"
  | "Reprovado"
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
  periodoLetivoId?: string;
}

export interface ContextoRelatorioAcademico {
  usuarioId: string;
  tipoUsuario: TipoUsuarioRelatorio;
}

export interface RelatorioAcademicoLinha {
  turmaDisciplinaId: string;
  matriculaTurmaDisciplinaId: string;
  periodoLetivoId: string;
  resultadoAcademico: ResultadoAcademico;
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
  avaliacao?: string | null;
  tipoAvaliacao?: string | null;
  valorAvaliacao?: string | null;
  dataAvaliacao?: string | Date | null;
  nota: string | null;
  frequencia: number | null;
  totalAulas?: number;
  presencas?: number;
  faltas?: number;
  situacao?: SituacaoAcademica | string | null;
}

export interface DisciplinaRelatorio {
  turmaDisciplinaId: string;
  matriculaTurmaDisciplinaId: string;
  resultadoAcademico: ResultadoAcademico;
  nome: string;
  aluno?: string;
  cargaHoraria: string;
  avaliacao?: string;
  tipoAvaliacao?: string;
  valorAvaliacao?: string;
  dataAvaliacao?: string;
  nota: string | null;
  frequencia: string | null;
  totalAulas?: string;
  presencas?: string;
  faltas?: string;
  situacao: SituacaoAcademica;
}

export interface PeriodoRelatorio {
  id: string;
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

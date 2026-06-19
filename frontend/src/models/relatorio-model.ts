export type PerfilRelatorio = "Professor" | "Aluno" | "Secretaria";
export type TipoUsuarioRelatorio = "aluno" | "professor" | "secretaria" | "administrador";
export type TipoRelatorio = "Notas" | "Frequencia" | "Consulta" | "Historico";
export type SituacaoAcademica =
  | "Aprovado"
  | "Recuperacao"
  | "Pendente"
  | "Regular"
  | "Atencao";

export interface DisciplinaRelatorio {
  nome: string;
  aluno?: string;
  cargaHoraria: string;
  nota?: string;
  frequencia?: string;
  situacao: SituacaoAcademica;
}

export interface PeriodoRelatorio {
  nome: string;
  disciplinas: DisciplinaRelatorio[];
}

export interface RelatorioLinha {
  [key: string]: string;
}

export interface RelatorioPdf {
  titulo: string;
  universidade: string;
  rodape: string;
  colunas: string[];
  larguras: number[];
  linhas: RelatorioLinha[];
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

export interface FiltrosRelatorios {
  perfil: PerfilRelatorio;
  busca: string;
  ano: string;
  tipo: string;
}

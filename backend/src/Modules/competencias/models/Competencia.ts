export type TipoCompetencia = "GERAL" | "TECNICA" | "SOCIOEMOCIONAL";

export interface Competencia {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipo: TipoCompetencia;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompetenciaCommand {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipo: TipoCompetencia;
  ativo: boolean;
}

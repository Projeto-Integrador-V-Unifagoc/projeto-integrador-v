export type AreaConhecimento =
  | "COMPUTACAO" | "MATEMATICA" | "CIENCIAS_HUMANAS" | "ADMINISTRACAO_GESTAO"
  | "COMUNICACAO" | "CIENCIAS_NATUREZA" | "FORMACAO_GERAL" | "OUTRA";
export type TipoCompetencia = "GERAL" | "TECNICA" | "SOCIOEMOCIONAL";
export type NivelCompetencia = "INTRODUZIR" | "DESENVOLVER" | "CONSOLIDAR";

export interface CompetenciaResponse {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipo: TipoCompetencia;
  ativo: boolean;
}

export interface DisciplinaCompetenciaResponse extends CompetenciaResponse {
  competencia_id: string;
  nivel_esperado: NivelCompetencia;
  obrigatoria: boolean;
  ordem: number;
}

export interface DisciplinaCompetenciaRequest {
  competenciaId: string;
  nivelEsperado: NivelCompetencia;
  obrigatoria: boolean;
  ordem: number;
}

export interface DisciplinaResponse {
  id: string;
  codigo: string;
  nome: string;
  carga_horaria: number;
  pre_requisito?: string;
  area_conhecimento?: AreaConhecimento;
  ementa?: string;
  carga_horaria_teorica?: number;
  carga_horaria_pratica?: number;
  carga_horaria_laboratorio?: number;
  carga_horaria_extensao?: number;
  observacoes?: string;
  ativo: boolean;
  competencias?: DisciplinaCompetenciaResponse[];
  quantidade_competencias?: number;
  cadastro_completo?: boolean;
}

export interface CriarDisciplinaRequest {
  codigo: string;
  nome: string;
  cargaHoraria: number;
  preRequisito?: string;
  areaConhecimento: AreaConhecimento;
  ementa: string;
  cargaHorariaTeorica: number;
  cargaHorariaPratica: number;
  cargaHorariaLaboratorio: number;
  cargaHorariaExtensao: number;
  observacoes?: string;
  competencias: DisciplinaCompetenciaRequest[];
  ativo?: boolean;
}

export interface DisciplinaView {
  id: string;
  codigo: string;
  nome: string;
  cargaHoraria: number;
  preRequisito?: string;
  areaConhecimento?: AreaConhecimento;
  quantidadeCompetencias: number;
  cadastroCompleto: boolean;
  ativo: boolean;
}

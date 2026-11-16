export type TipoTarefa = "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

export interface DisciplinaAluno {
  turmaDisciplinaId: string;
  disciplinaId: string;
  codigo: string;
  nome: string;
  turmaSigla: string;
  professorNome: string;
  cargaHoraria: number;
  periodoLetivo: { id: string; codigo: string };
}

export interface TarefaAluno {
  avaliacaoId: string;
  titulo: string;
  tipo: TipoTarefa;
  disciplinaNome: string;
  turmaDisciplinaId: string;
  dataVencimento: string;
  valor: number | null;
}

export type ClassificacaoCompetenciaAluno =
  | "DADOS_INSUFICIENTES"
  | "DIFICULDADE"
  | "ATENCAO"
  | "ADEQUADO";

export interface DesempenhoCompetenciaAluno {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  nivelEsperado: string;
  obrigatoria: boolean;
  media: number | null;
  cobertura: number;
  pontosPlanejados: number;
  pontosComNota: number;
  classificacao: ClassificacaoCompetenciaAluno;
  fontes: Array<{
    id: string;
    titulo: string;
    tipo: string;
    valor: number;
    pesoPercentual: number;
    pontosCompetencia: number | null;
    dataDevolucao: string | null;
    nota: number | null;
    aproveitamento: number | null;
  }>;
}

export interface DesempenhoCompetenciasAluno {
  criterios: { coberturaMinima: number; dificuldadeAbaixoDe: number; atencaoAbaixoDe: number };
  resumo: {
    totalPlanejadas: number;
    comResultados: number;
    comCoberturaSuficiente: number;
    emAtencao: number;
  };
  disciplinas: Array<{
    turmaDisciplinaId: string;
    disciplina: { id: string; codigo: string; nome: string };
    turmaSigla: string;
    competencias: DesempenhoCompetenciaAluno[];
  }>;
}

export interface HistoricoCompetenciasAluno {
  criterios: DesempenhoCompetenciasAluno["criterios"];
  resumo: { totalPeriodos: number; totalCompetencias: number; competenciasComEvolucao: number };
  periodos: Array<{
    id: string;
    codigo: string;
    ano: number;
    semestre: number;
    status: string;
    ativo: boolean;
  }>;
  series: Array<{
    id: string;
    codigo: string;
    nome: string;
    tipo: string;
    pontos: Array<{
      periodoId: string;
      periodoCodigo: string;
      media: number | null;
      cobertura: number;
      classificacao: ClassificacaoCompetenciaAluno;
      pontosPlanejados: number;
      pontosComNota: number;
      disciplinas: Array<{ id: string; codigo: string; nome: string }>;
    }>;
  }>;
}

// Rótulo exibido quando a avaliação não possui descrição própria.
export const ROTULO_POR_TIPO: Record<string, string> = {
  PROVA: "Prova",
  TPI: "TPI",
  TRABALHO: "Trabalho",
  RECUPERACAO: "Recuperação",
};

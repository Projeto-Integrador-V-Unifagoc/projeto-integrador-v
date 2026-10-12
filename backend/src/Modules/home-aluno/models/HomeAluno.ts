export type TipoTarefa = "REGULAR" | "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

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
  valor: string | null;
}

// Rótulo exibido quando a avaliação não possui descrição própria.
export const ROTULO_POR_TIPO: Record<string, string> = {
  REGULAR: "Avaliação",
  PROVA: "Prova",
  TPI: "TPI",
  TRABALHO: "Trabalho",
  RECUPERACAO: "Recuperação",
};

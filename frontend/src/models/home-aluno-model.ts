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

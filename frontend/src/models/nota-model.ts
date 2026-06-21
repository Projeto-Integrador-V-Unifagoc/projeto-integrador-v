export type TipoAvaliacaoNota = "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";

export type SituacaoNota =
  | "NAO_LANCADA"
  | "EM_ANDAMENTO"
  | "EM_RECUPERACAO"
  | "APROVADO"
  | "REPROVADO";

export interface AvaliacaoResumo {
  id: string;
  tipo: TipoAvaliacaoNota;
  descricao: string | null;
  valor: number;
}

export interface AtribuicaoNota {
  turmaDisciplinaId: string;
  turma: { id: string; sigla: string; descricao: string };
  disciplina: { id: string; codigo: string; nome: string };
  periodoLetivo: { id: string; codigo: string; status: string; fechado: boolean };
  professorNome: string;
  avaliacoes: AvaliacaoResumo[];
}

export interface OpcoesNota {
  contexto: { perfil: string };
  atribuicoes: AtribuicaoNota[];
}

export interface AlunoLancamento {
  alunoId: string;
  matriculaTurmaDisciplinaId: string;
  matricula: number;
  nome: string;
  valor: number | null;
  lancada: boolean;
  publicadaEm: string | null;
  prazoExpirado: boolean;
}

export interface Lancamento {
  avaliacao: {
    id: string;
    tipo: TipoAvaliacaoNota;
    descricao: string | null;
    valorMaximo: number;
    disciplina: { id: string; nome: string };
    turmaSigla: string;
  };
  periodoLetivo: { codigo: string; status: string; fechado: boolean };
  podeEditar: boolean;
  matriculasIrregulares: number;
  alunos: AlunoLancamento[];
}

export interface Boletim {
  pontosObtidos: number;
  pontosMaximos: number;
  mediaParcial: number | null;
  notaRecuperacao: number | null;
  mediaFinal: number | null;
  situacao: SituacaoNota;
  etapaRegularCompleta: boolean;
  elegivelRecuperacao: boolean;
  alerta: boolean;
}

export interface AlunoRendimento extends Boletim {
  alunoId: string;
  matriculaTurmaDisciplinaId: string;
  matricula: number;
  nome: string;
  notas: { avaliacaoId: string; valor: number | null }[];
}

export interface Rendimento {
  turmaDisciplinaId: string;
  disciplina: { id: string; codigo: string; nome: string };
  turma: { id: string; sigla: string };
  periodoLetivo: { codigo: string; status: string; fechado: boolean };
  avaliacoes: AvaliacaoResumo[];
  matriculasIrregulares: number;
  alunos: AlunoRendimento[];
}

export interface AlunoRecuperacao extends Boletim {
  alunoId: string;
  matriculaTurmaDisciplinaId: string;
  matricula: number;
  nome: string;
}

export interface Recuperacao {
  turmaDisciplinaId: string;
  disciplina: { id: string; nome: string };
  recuperacaoAvaliacaoId: string | null;
  periodoLetivo: { codigo: string; fechado: boolean };
  alunos: AlunoRecuperacao[];
}

export interface DisciplinaBoletim extends Boletim {
  turmaDisciplinaId: string;
  disciplina: { id: string; codigo: string; nome: string };
  disciplinaNome: string;
  turmaSigla: string;
  professorNome: string;
  periodoLetivo: { id: string; codigo: string };
  avaliacoes: {
    id: string;
    tipo: TipoAvaliacaoNota;
    descricao: string | null;
    valorMaximo: number;
    valorObtido: number | null;
    lancada: boolean;
  }[];
}

export interface BoletimAluno {
  alunoId: string;
  possuiAlerta: boolean;
  disciplinas: DisciplinaBoletim[];
}

export interface ResumoNotas {
  totalDisciplinas: number;
  disciplinasAbaixoDe60: number;
  possuiAlerta: boolean;
  disciplinasAlerta: { disciplinaNome: string; mediaParcial: number | null }[];
}

export interface ItemLoteNota {
  alunoId: string;
  valor: number;
}

export const SITUACAO_LABEL: Record<SituacaoNota, string> = {
  NAO_LANCADA: "Não lançada",
  EM_ANDAMENTO: "Em andamento",
  EM_RECUPERACAO: "Em recuperação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

export const situacaoCor = (s: SituacaoNota): "success" | "warning" | "error" | "info" | "default" =>
  s === "APROVADO" ? "success" : s === "EM_RECUPERACAO" ? "warning" : s === "REPROVADO" ? "error" : s === "EM_ANDAMENTO" ? "info" : "default";

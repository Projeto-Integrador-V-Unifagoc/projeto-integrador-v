export type AbaFicha =
  | "notas"
  | "financeiro"
  | "ficha-medica"
  | "documentos"
  | "ocorrencias"
  | "requerimentos"
  | "relatorios";

export type NotaAluno = {
  disciplina: string;
  mediaFinal: number;
  avaliacao: number;
  avaliacoes?: Array<{
    id: string;
    nome: string;
    nota: number;
    peso: number;
    matricula_turma_disciplina_id?: string | null;
  }>;
  matriculaTurmaDisciplinaId?: string | null;
  provaFinal: number;
  provaInova: number;
  provaSegundaChamada: number;
  conhecimentosGerais: number;
  faltas: number;
  percentualFaltas: number;
};

export type AlunoFicha = {
  nome: string;
  ra: string;
  unidade: string;
  curso: string;
  campusPolo: string;
  periodo: string;
  turno: string;
  turma: string;
  status: string;
  nascimento: string;
  idade: string;
  responsavelFinanceiro: string;
  email: string;
  semestre: string;
};

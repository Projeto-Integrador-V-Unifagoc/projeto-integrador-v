import type { ResultadoAcademico } from "../../models/resultado-academico-model";

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
  turmaNome?: string | null;
  professorNome?: string | null;
  periodoLetivo?: string | null;
  turmaDisciplinaId: string;
  matriculaTurmaDisciplinaId: string | null;
  resultadoAcademico: ResultadoAcademico | null;
  avaliacoes?: Array<{
    id: string;
    nome: string;
    nota: string | null;
    peso: string;
    matricula_turma_disciplina_id?: string | null;
  }>;
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

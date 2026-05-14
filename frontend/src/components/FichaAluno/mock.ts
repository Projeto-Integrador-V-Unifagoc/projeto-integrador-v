import type { AbaFicha, AlunoFicha, NotaAluno } from "./types";

export const alunoMock: AlunoFicha = {
  nome: "Joao Pedro Vidal dos Santos",
  ra: "00037728",
  unidade: "UNIFAGOC",
  curso: "Ciencia da Computacao",
  campusPolo: "Uba - MG",
  periodo: "5o Periodo",
  turno: "Noturno",
  turma: "A",
  status: "Matriculado",
  nascimento: "11/04/2005",
  idade: "21 anos",
  responsavelFinanceiro: "Joao Pedro Vidal dos Santos",
  email: "ppvidalsantos@gmail.com",
  semestre: "2026-1",
};

export const notasMock: NotaAluno[] = [
  {
    disciplina: "Aspectos Sociologicos e Antropologicos",
    mediaFinal: 13,
    avaliacao: 0,
    provaFinal: 0,
    provaInova: 12.25,
    provaSegundaChamada: 0,
    conhecimentosGerais: 0.5,
    faltas: 2,
    percentualFaltas: 4.17,
  },
  {
    disciplina: "Banco de Dados I",
    mediaFinal: 9,
    avaliacao: 0,
    provaFinal: 0,
    provaInova: 8.4,
    provaSegundaChamada: 0,
    conhecimentosGerais: 0.5,
    faltas: 2,
    percentualFaltas: 1.67,
  },
  {
    disciplina: "Engenharia de Software",
    mediaFinal: 19,
    avaliacao: 5.75,
    provaFinal: 0,
    provaInova: 12.25,
    provaSegundaChamada: 0,
    conhecimentosGerais: 0.5,
    faltas: 4,
    percentualFaltas: 3.33,
  },
  {
    disciplina: "Gerencia de Projetos de Software",
    mediaFinal: 16,
    avaliacao: 6.74,
    provaFinal: 0,
    provaInova: 8.75,
    provaSegundaChamada: 0,
    conhecimentosGerais: 0.5,
    faltas: 2,
    percentualFaltas: 2.78,
  },
  {
    disciplina: "Projeto Integrador de Extensao V",
    mediaFinal: 11,
    avaliacao: 11.1,
    provaFinal: 0,
    provaInova: 0,
    provaSegundaChamada: 0,
    conhecimentosGerais: 0,
    faltas: 0,
    percentualFaltas: 0,
  },
];

export const abasFicha: { label: string; value: AbaFicha }[] = [
  { label: "Notas/Faltas", value: "notas" },
  { label: "Financeiro", value: "financeiro" },
  { label: "Ficha Medica", value: "ficha-medica" },
  { label: "Documentos", value: "documentos" },
  { label: "Ocorrencias", value: "ocorrencias" },
  { label: "Requerimentos", value: "requerimentos" },
  { label: "Relatorios", value: "relatorios" },
];

export const opcoesSemestre = ["2026-1", "2025-2", "2025-1"];

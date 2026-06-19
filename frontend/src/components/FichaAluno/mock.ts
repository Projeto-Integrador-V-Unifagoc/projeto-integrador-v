import type { AbaFicha, AlunoFicha } from "./types";

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

export const abasFicha: { label: string; value: AbaFicha }[] = [
  { label: "Notas/Faltas", value: "notas" },
  { label: "Documentos", value: "documentos" },
  { label: "Requerimentos", value: "requerimentos" },
  { label: "Relatorios", value: "relatorios" },
];

export const opcoesSemestre = ["2026-1", "2025-2", "2025-1"];

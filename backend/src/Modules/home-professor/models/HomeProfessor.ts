export type NivelAtencaoProfessor = "CRITICO" | "ATENCAO" | "REGULAR" | "SEM_DADOS";

export interface CriteriosProfessor {
  mediaMinima: number;
  frequenciaMinima: number;
  frequenciaAtencao: number;
}

export const CRITERIOS_PROFESSOR: CriteriosProfessor = {
  mediaMinima: 60,
  frequenciaMinima: 75,
  frequenciaAtencao: 80,
};

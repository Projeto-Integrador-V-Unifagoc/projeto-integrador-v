export interface ProfessorAcademico {
  id: string;
  nome: string;
  curso?: {
    id: string;
    nome: string;
  };
}

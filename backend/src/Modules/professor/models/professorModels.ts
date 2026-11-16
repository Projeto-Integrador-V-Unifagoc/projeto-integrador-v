export interface CriarProfessorDTO {
  nome: string;
  cpf: string;
  data_nascimento: string | Date;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade_id: string;
  estado: string;
  cep: string;
  // Linhas da matriz curricular (curso_disciplina) em que o professor leciona.
  cursoDisciplinaIds: string[];
  faculdade_id?: string;
}

export interface AtualizarProfessor extends Partial<CriarProfessorDTO> {}

export interface FiltroProfessor {
  ativo?: boolean;
}

// `id` é o da curso_disciplina; a mesma disciplina em dois cursos são dois vínculos.
export interface DisciplinaDoProfessor {
  id: string;
  disciplinaId: string;
  nome: string;
  cursoId: string;
  cursoNome: string;
}

export interface ProfessorOpcao {
  id: string;
  nome: string;
  disciplinas: DisciplinaDoProfessor[];
}

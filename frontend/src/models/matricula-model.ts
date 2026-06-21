export interface AlunoParaMatricula {
    id: string;
    matricula: number;
    periodo: string | number;
    nome: string;
    cpf: string;
    email?: string;
    curso_id?: string;
    curso_nome?: string;
}

export interface TurmaDisponivel {
  id: string;
  turma_id: string;
  turma_sigla: string;
  turma_descricao: string;
  periodo_letivo: string;
  periodo_curricular: number;
    capacidade_alunos: number;
    vagas_disponiveis: number;
    disciplina_id: string;
    disciplina_nome: string;
    disciplina_codigo: string;
    carga_horaria: number;
    professor_nome: string;
    curso_id: string;
    curso_nome: string;
}

export interface MatriculaCriada {
    id: string;
    aluno_id: string;
  turma_id: string;
  turma_disciplina_id: string;
  matricula_turma_disciplina_id: string;
  status: string;
}

export interface MatriculaDetalhada extends MatriculaCriada {
    aluno_nome: string;
    aluno_matricula: number;
    disciplina_nome: string;
  periodo_letivo: string;
    curso_nome: string;
    professor_nome: string | null;
}

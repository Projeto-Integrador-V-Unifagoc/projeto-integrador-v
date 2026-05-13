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
    semestre: string;
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
    status: string | null;
}

export interface MatriculaDetalhada extends MatriculaCriada {
    aluno_nome: string;
    aluno_matricula: number;
    disciplina_nome: string;
    semestre: string;
    curso_nome: string;
    professor_nome: string | null;
}

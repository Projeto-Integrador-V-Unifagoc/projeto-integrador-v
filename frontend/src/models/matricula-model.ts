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

/**
 * Turma disponível para matrícula.
 *
 * A turma é o agrupamento do curso em um período letivo — não uma disciplina.
 * As disciplinas ofertadas nela vêm de `DisciplinaDaTurma`.
 */
export interface TurmaDisponivel {
    id: string;
    sigla: string;
    descricao: string;
    turno: string;
    periodo_curricular: number;
    capacidade_alunos: number;
    vagas_ocupadas: number;
    vagas_disponiveis: number;
    total_disciplinas: number;
    periodo_letivo_id: string;
    periodo_letivo_codigo: string;
    ano: number;
    semestre: number;
    curso_id: string;
    curso_nome: string;
}

/** Disciplina ofertada em uma turma — cada uma vira um vínculo do aluno. */
export interface DisciplinaDaTurma {
    turma_disciplina_id: string;
    disciplina_id: string;
    disciplina_codigo: string;
    disciplina_nome: string;
    carga_horaria: number;
    obrigatoria: boolean;
    periodo_ideal: number | null;
    professor_id: string;
    professor_nome: string;
}

export interface MatriculaCriada {
    id: string;
    aluno_id: string;
    curso_id: string;
    turma_id: string;
    status: string;
    data_matricula: string;
    disciplinas_vinculadas: number;
}

export interface MatriculaDetalhada {
    id: string;
    aluno_id: string;
    curso_id: string;
    turma_id: string;
    status: string;
    data_matricula: string;
    aluno_nome: string;
    aluno_cpf: string;
    aluno_matricula: number;
    curso_nome: string;
    turma_sigla: string;
    turma_descricao: string;
    turno: string;
    periodo_curricular: number;
    periodo_letivo_codigo: string;
    ano: number;
    semestre: number;
    total_disciplinas: number;
    documentos_total: number;
    documentos_pendentes: number;
    documentos_aprovados: number;
    documentos_reprovados: number;
}

/** Vínculo do aluno com uma disciplina da turma. */
export interface VinculoAcademico {
    id: string;
    status: string;
    data_vinculo: string;
    turma_disciplina_id: string;
    disciplina_id: string;
    disciplina_codigo: string;
    disciplina_nome: string;
    carga_horaria: number;
    professor_nome: string | null;
}

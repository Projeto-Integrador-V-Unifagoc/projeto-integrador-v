export type NivelAtencaoProfessor = "CRITICO" | "ATENCAO" | "REGULAR" | "SEM_DADOS";

export interface PeriodoProfessor { id: string; codigo: string; ano: number; semestre: number; ativo: boolean; status: string }
export interface AlunoProfessor { id: string; matricula: number; nome: string; media: number | null; frequencia: number | null; nivel: NivelAtencaoProfessor; motivo: string }
export interface AtribuicaoProfessor {
  id: string;
  turma: { id: string; sigla: string; descricao: string; turno: string };
  curso: { id: string; nome: string };
  disciplina: { id: string; codigo: string; nome: string; areaConhecimento: string | null; ementa: string | null; cargaHoraria: number };
  totalAlunos: number; alunosComNota: number; alunosComFrequencia: number;
  mediaTurma: number | null; frequenciaMedia: number | null; alunosEmAtencao: number;
  totalAvaliacoes: number; lancamentosPendentes: number;
}
export interface DashboardProfessor {
  professor: { id: string; nome: string };
  periodoSelecionado: PeriodoProfessor | null;
  periodosDisponiveis: PeriodoProfessor[];
  criterios: { mediaMinima: number; frequenciaMinima: number; frequenciaAtencao: number };
  resumo: { turmasAtivas: number; disciplinasDistintas: number; alunosUnicos: number; lancamentosPendentes: number };
  atribuicoes: AtribuicaoProfessor[];
  avaliacoesProximas: Array<{ id: string; turmaDisciplinaId: string; titulo: string; tipo: string; data: string; valor: number; disciplinaNome: string; turmaSigla: string; notasLancadas: number; notasEsperadas: number }>;
  alunosEmAtencao: Array<AlunoProfessor & { turmaDisciplinaId: string; disciplinaNome: string; turmaSigla: string }>;
  geradoEm: string;
}
export interface DetalheAtribuicaoProfessor extends AtribuicaoProfessor {
  periodo: PeriodoProfessor;
  alunos: AlunoProfessor[];
  competencias: Array<{ id: string; codigo: string; nome: string; tipo: string; nivel_esperado: string; obrigatoria: boolean }>;
}

export interface DetalheAlunoAtencaoProfessor {
  aluno: { id: string; matricula: number; nome: string };
  contexto: {
    turma: AtribuicaoProfessor["turma"];
    curso: AtribuicaoProfessor["curso"];
    disciplina: AtribuicaoProfessor["disciplina"];
    periodo: PeriodoProfessor;
  };
  resumo: {
    media: number | null;
    frequencia: number | null;
    nivel: NivelAtencaoProfessor;
    motivo: string;
    presencas: number;
    faltas: number;
    totalAulas: number;
    avaliacoesLancadas: number;
    totalAvaliacoes: number;
  };
  criterios: DashboardProfessor["criterios"];
  pontosAtencao: Array<{
    id: string;
    severidade: "CRITICO" | "ATENCAO" | "INFORMATIVO";
    titulo: string;
    descricao: string;
  }>;
  avaliacoes: Array<{
    id: string;
    titulo: string;
    tipo: string;
    valor: number;
    dataDevolucao: string | null;
    nota: number | null;
    percentual: number | null;
    status: "PENDENTE" | "LANCADA";
  }>;
}

export type NivelAtencaoProfessor = "CRITICO" | "ATENCAO" | "REGULAR" | "SEM_DADOS";

export interface PeriodoProfessor { id: string; codigo: string; ano: number; semestre: number; ativo: boolean; status: string }
export type ClassificacaoCompetencia = "DADOS_INSUFICIENTES" | "DIFICULDADE" | "ATENCAO" | "ADEQUADO";
export interface DesempenhoCompetenciaProfessor {
  id: string; codigo: string; nome: string; tipo: string; nivelEsperado: string; obrigatoria: boolean;
  media: number | null; cobertura: number; pontosPlanejados: number; pontosComNota: number;
  alunosComDados: number; totalAlunos: number; classificacao: ClassificacaoCompetencia;
  distribuicao: { dificuldade: number; atencao: number; adequado: number; semDados: number };
  fontes: Array<{
    id: string; titulo: string; tipo: string; valor: number; pesoPercentual: number; pontosCompetencia: number | null;
    dataDevolucao: string | null; notasLancadas?: number; notasEsperadas?: number; media?: number | null;
    nota?: number | null; aproveitamento?: number | null;
  }>;
}
export interface AlunoProfessor { id: string; matricula: number; nome: string; media: number | null; frequencia: number | null; nivel: NivelAtencaoProfessor; motivo: string }
export interface AtribuicaoProfessor {
  id: string;
  turma: { id: string; sigla: string; descricao: string; turno: string };
  curso: { id: string; nome: string };
  disciplina: { id: string; codigo: string; nome: string; areaConhecimento: string | null; ementa: string | null; cargaHoraria: number };
  totalAlunos: number; alunosComNota: number; alunosComFrequencia: number;
  mediaTurma: number | null; frequenciaMedia: number | null; alunosEmAtencao: number;
  totalAvaliacoes: number; lancamentosPendentes: number;
  notasFaltantes: number;
  /** Alunos da oferta (enviado no dashboard para filtrar por turma/disciplina). */
  alunos?: AlunoProfessor[];
}
export interface AvaliacaoPeriodoProfessor {
  id: string;
  turmaDisciplinaId: string;
  titulo: string;
  tipo: string;
  valor: number;
  dataDevolucao: string | null;
  notasLancadas: number;
  notasEsperadas: number;
  /** Média das notas lançadas ÷ valor da avaliação × 100. */
  mediaPercentual: number | null;
  /** Notas incompletas e devolução já passou (ou sem data). */
  vencida: boolean;
}
export interface ChamadaPendenteProfessor {
  aulaId: string;
  turmaDisciplinaId: string;
  data: string;
  registrados: number;
  esperados: number;
}
export interface DashboardProfessor {
  professor: { id: string; nome: string };
  periodoSelecionado: PeriodoProfessor | null;
  periodosDisponiveis: PeriodoProfessor[];
  criterios: { mediaMinima: number; frequenciaMinima: number; frequenciaAtencao: number };
  resumo: {
    turmasAtivas: number; disciplinasDistintas: number; alunosUnicos: number;
    lancamentosPendentes: number; avaliacoesIncompletas: number; notasFaltantes: number;
  };
  atribuicoes: AtribuicaoProfessor[];
  avaliacoesProximas: Array<{ id: string; turmaDisciplinaId: string; titulo: string; tipo: string; data: string; valor: number; disciplinaNome: string; turmaSigla: string; notasLancadas: number; notasEsperadas: number }>;
  alunosEmAtencao: Array<AlunoProfessor & { turmaDisciplinaId: string; disciplinaNome: string; turmaSigla: string }>;
  competenciasEmDificuldade: Array<DesempenhoCompetenciaProfessor & { turmaDisciplinaId: string; disciplinaNome: string; turmaSigla: string }>;
  proximasAulas: Array<{ id: string; turmaDisciplinaId: string; data: string; horaInicio: string; horaFim: string; local: string | null; turmaSigla: string; disciplinaCodigo: string; disciplinaNome: string }>;
  avaliacoes?: AvaliacaoPeriodoProfessor[];
  chamadasPendentes?: ChamadaPendenteProfessor[];
  geradoEm: string;
}
export interface DetalheAtribuicaoProfessor extends AtribuicaoProfessor {
  periodo: PeriodoProfessor;
  alunos: AlunoProfessor[];
  competencias: Array<{ id: string; codigo: string; nome: string; tipo: string; nivel_esperado: string; obrigatoria: boolean }>;
  criteriosCompetencia: { coberturaMinima: number; dificuldadeAbaixoDe: number; atencaoAbaixoDe: number };
  desempenhoCompetencias: DesempenhoCompetenciaProfessor[];
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
  criteriosCompetencia: { coberturaMinima: number; dificuldadeAbaixoDe: number; atencaoAbaixoDe: number };
  pontosAtencao: Array<{
    id: string;
    severidade: "CRITICO" | "ATENCAO" | "INFORMATIVO";
    titulo: string;
    descricao: string;
  }>;
  competencias: DesempenhoCompetenciaProfessor[];
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

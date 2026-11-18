export type ClassificacaoCoordenacao = "DADOS_INSUFICIENTES" | "DIFICULDADE" | "ATENCAO" | "ADEQUADO";

export interface PeriodoCoordenacao {
  id: string; codigo: string; ano: number; semestre: number; ativo: boolean; status: string;
  dataInicio: string | null; dataFim: string | null;
}

export interface IndicadorComparativoCoordenacao {
  atual: number;
  anterior: number;
  variacao: number;
}

export interface DashboardCoordenacao {
  periodoSelecionado: PeriodoCoordenacao | null;
  periodosDisponiveis: PeriodoCoordenacao[];
  criteriosCompetencia: { coberturaMinima: number; dificuldadeAbaixoDe: number; atencaoAbaixoDe: number };
  resumo: {
    turmasAtivas: number; ofertasAtivas: number; alunosAtivos: number;
    ofertasComHorario: number; coberturaHorarios: number;
    avaliacoes: number; avaliacoesMapeadas: number; coberturaCompetencias: number;
  };
  matrizes: { vigentes: number; rascunhos: number; encerradas: number };
  panoramaCursos: Array<{
    id: string; codigo: string; nome: string; turmasAtivas: number; ofertasAtivas: number;
    alunosAtivos: number; ofertasComHorario: number; coberturaHorarios: number;
  }>;
  competencias: Array<{
    id: string; codigo: string; nome: string; tipo: string; media: number | null; cobertura: number;
    totalOfertas: number; totalCursos: number; classificacao: ClassificacaoCoordenacao;
  }>;
  comparacaoPeriodoAnterior: {
    periodo: PeriodoCoordenacao;
    resumo: {
      alunosAtivos: IndicadorComparativoCoordenacao;
      ofertasAtivas: IndicadorComparativoCoordenacao;
      coberturaHorarios: IndicadorComparativoCoordenacao;
      coberturaCompetencias: IndicadorComparativoCoordenacao;
    };
    competencias: Array<{
      id: string; codigo: string; nome: string;
      mediaAtual: number | null; mediaAnterior: number | null; variacaoMedia: number | null;
      coberturaAtual: number | null; coberturaAnterior: number | null;
    }>;
  } | null;
  qualidade: Array<{
    id: string; titulo: string; descricao: string; quantidade: number;
    severidade: "CRITICO" | "ATENCAO" | "INFORMATIVO"; rota: string;
  }>;
  geradoEm: string;
}

export interface DetalheCursoCoordenacao {
  curso: { id: string; codigo: string; nome: string };
  periodo: PeriodoCoordenacao;
  resumo: { turmasAtivas: number; ofertasAtivas: number; alunosAtivos: number; ofertasComHorario: number; coberturaHorarios: number };
  matrizes: Array<{
    id: string; codigo: string; versao: string; status: "RASCUNHO" | "VIGENTE" | "ENCERRADA";
    vigenciaInicio: string | null; vigenciaFim: string | null; totalDisciplinas: number; cargaHoraria: number;
  }>;
  turmas: Array<{
    id: string; sigla: string; descricao: string; turno: string; periodoCurricular: number;
    capacidadeAlunos: number; status: string; alunosAtivos: number; ofertasAtivas: number;
    ofertasComHorario: number; coberturaHorarios: number;
  }>;
  ofertas: Array<{
    id: string; status: string; turma: { id: string; sigla: string; turno: string };
    disciplina: { id: string; codigo: string; nome: string }; professor: { id: string; nome: string };
    totalAlunos: number; totalAvaliacoes: number; avaliacoesMapeadas: number; coberturaCompetencias: number;
    horarios: Array<{ id: string; diaSemana: number; horaInicio: string; horaFim: string; local: string | null; vigenciaInicio: string | null; vigenciaFim: string | null }>;
  }>;
  competencias: DashboardCoordenacao["competencias"];
  criteriosCompetencia: DashboardCoordenacao["criteriosCompetencia"];
  geradoEm: string;
}


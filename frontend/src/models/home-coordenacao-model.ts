export type ClassificacaoCoordenacao = "DADOS_INSUFICIENTES" | "DIFICULDADE" | "ATENCAO" | "ADEQUADO";

export interface PeriodoCoordenacao {
  id: string; codigo: string; ano: number; semestre: number; ativo: boolean; status: string;
  dataInicio: string | null; dataFim: string | null;
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
  qualidade: Array<{
    id: string; titulo: string; descricao: string; quantidade: number;
    severidade: "CRITICO" | "ATENCAO" | "INFORMATIVO"; rota: string;
  }>;
  geradoEm: string;
}


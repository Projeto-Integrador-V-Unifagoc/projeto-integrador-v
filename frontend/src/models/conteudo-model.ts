// Conteúdo acadêmico: Disciplina (no curso) → Tópico → Página → blocos do editor.

export type SituacaoPosse = "minha" | "disponivel" | "de_outro_professor";

export interface CursoConteudo {
    id: string;
    nome: string;
    codigo: string;
    totalDisciplinas: number;
}

export interface DisciplinaConteudo {
    cursoDisciplinaId: string;
    disciplina: { id: string; nome: string; codigo: string };
    cargaHoraria: number;
    periodoIdeal: number | null;
    // null para secretaria/administrador, que enxergam todas.
    situacao: SituacaoPosse | null;
    totalTopicos: number | null;
    totalPublicados: number | null;
    totalProfessores: number | null;
    responsavel: { id: string; nome: string } | null;
}

export interface DisciplinasDoCurso {
    curso: { id: string; nome: string; codigo: string };
    disciplinas: DisciplinaConteudo[];
}

export interface MetricasPagina {
    palavras: number;
    imagens: number;
    videos: number;
    arquivos: number;
    links: number;
    minutosEstimados: number;
}

export interface PaginaResumo {
    id: string;
    topicoId: string;
    titulo: string | null;
    ordem: number;
    oculta: boolean;
    versao: number;
    metricas: MetricasPagina;
    atualizadoEm: string | null;
    atualizadoPorNome: string | null;
}

export interface PaginaCompleta extends PaginaResumo {
    blocos: unknown[];
    topico: { id: string; titulo: string; publicado: boolean };
    cursoDisciplinaId: string;
}

export interface TopicoConteudo {
    id: string;
    titulo: string;
    descricao: string | null;
    ordem: number;
    publicado: boolean;
    publicadoEm: string | null;
    atualizadoEm: string | null;
    atualizadoPorNome: string | null;
    paginas: PaginaResumo[];
}

export interface LimitesConteudo {
    topicos: { recomendado: number; maximo: number };
    paginasPorTopico: { recomendado: number; maximo: number };
    pagina: { minutosRecomendado: number; minutosMaximo: number; maxVideos: number; maxImagens: number };
    tempo: {
        palavrasPorMinuto: number;
        segundosPorImagem: number;
        segundosPorVideo: number;
        segundosPorArquivo: number;
        segundosPorLink: number;
    };
}

export interface DetalheConteudo {
    cursoDisciplinaId: string;
    curso: { id: string; nome: string; codigo: string };
    disciplina: { id: string; nome: string; codigo: string };
    cargaHoraria: number;
    perfil: "gestor" | "professor";
    responsavel: { id: string; nome: string } | null;
    podeTransferir: boolean;
    professoresVinculados: { id: string; nome: string; ativo: boolean }[];
    limites: LimitesConteudo;
    topicos: TopicoConteudo[];
}

export interface ArquivoConteudo {
    id: string;
    url: string;
    nome: string;
    mime: string;
    tamanhoBytes: number;
}

export interface OrdemConteudo {
    topicos: { id: string; paginas: string[] }[];
}

// Leitura do conteúdo publicado (aluno e pré-visualização).
export interface ConteudoPublicado {
    turmaDisciplinaId: string | null;
    disciplina: { id: string; nome: string; codigo: string };
    curso: { nome: string };
    turmaSigla: string | null;
    professorNome: string | null;
    topicos: {
        id: string;
        titulo: string;
        descricao: string | null;
        publicadoEm: string | null;
        paginas: { id: string; titulo: string | null; minutosEstimados: number }[];
    }[];
}

export interface PaginaPublicada {
    id: string;
    titulo: string | null;
    topicoId: string;
    blocos: unknown[];
    minutosEstimados: number;
    atualizadoEm: string | null;
}

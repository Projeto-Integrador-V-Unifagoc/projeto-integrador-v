// Perfis que acessam o módulo. Administrador é tratado como secretaria ("gestor").
// O aluno só lê o conteúdo publicado das disciplinas em que está matriculado.
export type PerfilConteudo = "gestor" | "professor" | "aluno";

export interface ContextoConteudo {
  usuarioId: string;
  perfil: PerfilConteudo;
  professorId?: string;
  alunoId?: string;
}

// Situação da disciplina para o professor que a enxerga na lista.
export type SituacaoPosse =
  | "minha" // ele é o responsável
  | "disponivel" // sem responsável e sem conteúdo: pode assumir criando o 1º tópico
  | "de_outro_professor"; // outro professor (ou a secretaria, sem responsável) mantém o conteúdo

export interface CriarTopicoRequest {
  titulo: string;
  descricao?: string | null;
}

export interface AtualizarTopicoRequest {
  titulo?: string;
  descricao?: string | null;
}

export interface AtualizarPaginaRequest {
  titulo?: string | null;
  oculta?: boolean;
}

export interface SalvarBlocosRequest {
  blocos: unknown;
  versao: number;
}

export interface DividirPaginaRequest {
  aPartirDoBloco: number;
  versao: number;
}

export interface OrdemRequest {
  topicos: { id: string; paginas: string[] }[];
}

export interface ArquivoEnviado {
  nomeOriginal: string;
  caminho: string;
  mime: string;
  tamanhoBytes: number;
}

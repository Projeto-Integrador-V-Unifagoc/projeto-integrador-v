import { api } from "../lib/axios";
import type {
    ArquivoConteudo,
    ConteudoPublicado,
    CursoConteudo,
    DetalheConteudo,
    DisciplinasDoCurso,
    OrdemConteudo,
    PaginaCompleta,
    PaginaPublicada,
    PaginaResumo,
    TopicoConteudo,
} from "../models/conteudo-model";

export const conteudoApi = {
    async listarCursos(): Promise<CursoConteudo[]> {
        return (await api.get<CursoConteudo[]>("/conteudos/cursos")).data;
    },

    async listarDisciplinas(cursoId: string): Promise<DisciplinasDoCurso> {
        return (await api.get<DisciplinasDoCurso>(`/conteudos/cursos/${cursoId}/disciplinas`)).data;
    },

    async detalhar(cursoDisciplinaId: string): Promise<DetalheConteudo> {
        return (await api.get<DetalheConteudo>(`/conteudos/curso-disciplinas/${cursoDisciplinaId}`)).data;
    },

    async transferirResponsavel(cursoDisciplinaId: string, professorId: string): Promise<DetalheConteudo> {
        return (await api.put<DetalheConteudo>(`/conteudos/curso-disciplinas/${cursoDisciplinaId}/responsavel`, { professorId })).data;
    },

    async reordenar(cursoDisciplinaId: string, ordem: OrdemConteudo): Promise<DetalheConteudo> {
        return (await api.put<DetalheConteudo>(`/conteudos/curso-disciplinas/${cursoDisciplinaId}/ordem`, ordem)).data;
    },

    async criarTopico(cursoDisciplinaId: string, dados: { titulo: string; descricao?: string | null }) {
        return (
            await api.post<{ topico: TopicoConteudo; assumiuResponsabilidade: boolean; avisos: string[] }>(
                `/conteudos/curso-disciplinas/${cursoDisciplinaId}/topicos`,
                dados,
            )
        ).data;
    },

    async atualizarTopico(topicoId: string, dados: { titulo?: string; descricao?: string | null }): Promise<TopicoConteudo> {
        return (await api.patch<TopicoConteudo>(`/conteudos/topicos/${topicoId}`, dados)).data;
    },

    async publicarTopico(topicoId: string, publicar: boolean): Promise<TopicoConteudo> {
        const acao = publicar ? "publicar" : "despublicar";
        return (await api.post<TopicoConteudo>(`/conteudos/topicos/${topicoId}/${acao}`)).data;
    },

    async duplicarTopico(topicoId: string): Promise<TopicoConteudo> {
        return (await api.post<TopicoConteudo>(`/conteudos/topicos/${topicoId}/duplicar`)).data;
    },

    async excluirTopico(topicoId: string): Promise<void> {
        await api.delete(`/conteudos/topicos/${topicoId}`);
    },

    async criarPagina(topicoId: string, titulo?: string | null) {
        return (
            await api.post<{ pagina: PaginaResumo; avisos: string[] }>(`/conteudos/topicos/${topicoId}/paginas`, { titulo })
        ).data;
    },

    async obterPagina(paginaId: string): Promise<PaginaCompleta> {
        return (await api.get<PaginaCompleta>(`/conteudos/paginas/${paginaId}`)).data;
    },

    async atualizarPagina(paginaId: string, dados: { titulo?: string | null; oculta?: boolean }): Promise<PaginaCompleta> {
        return (await api.patch<PaginaCompleta>(`/conteudos/paginas/${paginaId}`, dados)).data;
    },

    async salvarBlocos(paginaId: string, blocos: unknown[], versao: number) {
        return (
            await api.put<{ pagina: PaginaCompleta; avisos: string[] }>(`/conteudos/paginas/${paginaId}`, { blocos, versao })
        ).data;
    },

    async dividirPagina(paginaId: string, aPartirDoBloco: number, versao: number) {
        return (
            await api.post<{ pagina: PaginaCompleta; novaPagina: PaginaResumo }>(`/conteudos/paginas/${paginaId}/dividir`, {
                aPartirDoBloco,
                versao,
            })
        ).data;
    },

    async duplicarPagina(paginaId: string): Promise<PaginaResumo> {
        return (await api.post<PaginaResumo>(`/conteudos/paginas/${paginaId}/duplicar`)).data;
    },

    async excluirPagina(paginaId: string): Promise<void> {
        await api.delete(`/conteudos/paginas/${paginaId}`);
    },

    async enviarArquivo(cursoDisciplinaId: string, arquivo: File, onProgresso?: (percentual: number) => void) {
        const formulario = new FormData();
        formulario.append("arquivo", arquivo);
        const resposta = await api.post<ArquivoConteudo>(`/conteudos/curso-disciplinas/${cursoDisciplinaId}/arquivos`, formulario, {
            onUploadProgress: (evento) => {
                if (onProgresso && evento.total) onProgresso(Math.round((evento.loaded / evento.total) * 100));
            },
        });
        return resposta.data;
    },

    // ---------- leitura do conteúdo publicado ----------

    async conteudoDoAluno(turmaDisciplinaId: string): Promise<ConteudoPublicado> {
        return (await api.get<ConteudoPublicado>(`/conteudos/aluno/turma-disciplinas/${turmaDisciplinaId}`)).data;
    },

    async visualizarComoAluno(cursoDisciplinaId: string): Promise<ConteudoPublicado> {
        return (await api.get<ConteudoPublicado>(`/conteudos/curso-disciplinas/${cursoDisciplinaId}/visualizacao`)).data;
    },

    async paginaPublicada(paginaId: string): Promise<PaginaPublicada> {
        return (await api.get<PaginaPublicada>(`/conteudos/publicado/paginas/${paginaId}`)).data;
    },

    // Os arquivos só saem com login: o editor busca com o token e exibe via blob.
    async baixarArquivo(arquivoId: string): Promise<Blob> {
        return (await api.get<Blob>(`/conteudos/arquivos/${arquivoId}`, { responseType: "blob" })).data;
    },
};

// Mensagem amigável a partir do erro da API (formato { mensagem } do módulo).
export function mensagemDeErro(erro: unknown, padrao: string) {
    const resposta = (erro as { response?: { data?: { mensagem?: string; error?: string } } })?.response?.data;
    return resposta?.mensagem || resposta?.error || padrao;
}

export function statusDoErro(erro: unknown): number | undefined {
    return (erro as { response?: { status?: number } })?.response?.status;
}

export function codigoDoErro(erro: unknown): string | undefined {
    return (erro as { response?: { data?: { codigo?: string } } })?.response?.data?.codigo;
}

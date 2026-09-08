export type EstruturaAcademicaErrorCode =
    | "DADOS_INVALIDOS"
    | "NAO_ENCONTRADO"
    | "CONFLITO"
    | "TURMA_EM_USO"
    | "PERIODO_INDISPONIVEL"
    | "OFERTA_COM_HISTORICO";

export class EstruturaAcademicaError extends Error {
    constructor(
        public readonly status: number,
        public readonly codigo: EstruturaAcademicaErrorCode,
        mensagem: string
    ) {
        super(mensagem);
        this.name = "EstruturaAcademicaError";
    }
}

export const erroEstruturaAcademica = {
    invalido: (mensagem: string) => new EstruturaAcademicaError(400, "DADOS_INVALIDOS", mensagem),
    naoEncontrado: (mensagem: string) => new EstruturaAcademicaError(404, "NAO_ENCONTRADO", mensagem),
    conflito: (mensagem: string) => new EstruturaAcademicaError(409, "CONFLITO", mensagem),
    turmaEmUso: (mensagem: string) => new EstruturaAcademicaError(409, "TURMA_EM_USO", mensagem),
    periodoIndisponivel: (mensagem: string) => new EstruturaAcademicaError(409, "PERIODO_INDISPONIVEL", mensagem),
    ofertaComHistorico: (mensagem: string) => new EstruturaAcademicaError(409, "OFERTA_COM_HISTORICO", mensagem)
};

export function responderErroEstruturaAcademica(res: any, error: unknown) {
    if (error instanceof EstruturaAcademicaError) {
        return res.status(error.status).json({
            codigo: error.codigo,
            mensagem: error.message,
            error: error.message
        });
    }

    const erroBanco = error as { code?: string };

    if (erroBanco?.code === "23505") {
        const mensagem = "Ja existe um registro com os dados informados.";
        return res.status(409).json({ codigo: "CONFLITO", mensagem, error: mensagem });
    }

    if (erroBanco?.code === "23503") {
        const mensagem = "O registro possui vinculos e nao pode ser removido ou alterado.";
        return res.status(409).json({ codigo: "CONFLITO", mensagem, error: mensagem });
    }

    const mensagem = "Ocorreu um erro inesperado ao processar a estrutura academica.";
    return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem, error: mensagem });
}

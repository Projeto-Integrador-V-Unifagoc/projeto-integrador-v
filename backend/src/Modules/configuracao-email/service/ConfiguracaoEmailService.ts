import {
    ConfiguracaoEmailRepository,
    CHAVES_DISPARADOR,
    type AtualizarConfiguracaoDTO,
    type ConfiguracaoEmail,
} from "../repository/ConfiguracaoEmailRepository";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITES: Record<keyof AtualizarConfiguracaoDTO, number> = {
    ativo: 0,
    remetente_nome: 120,
    remetente_email: 160,
    assunto: 200,
    titulo: 200,
    mensagem: 4000,
};

export class ConfiguracaoEmailError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "ConfiguracaoEmailError";
    }
}

export class ConfiguracaoEmailService {
    constructor(private readonly repository = new ConfiguracaoEmailRepository()) {}

    async listar(): Promise<ConfiguracaoEmail[]> {
        return this.repository.listar();
    }

    async buscarPorChave(chave: string): Promise<ConfiguracaoEmail> {
        const configuracao = await this.repository.buscarPorChave(chave);
        if (!configuracao) {
            throw new ConfiguracaoEmailError(404, `Disparador ${chave} não encontrado.`);
        }
        return configuracao;
    }

    async atualizar(chave: string, dados: AtualizarConfiguracaoDTO): Promise<ConfiguracaoEmail> {
        if (!(CHAVES_DISPARADOR as readonly string[]).includes(chave)) {
            throw new ConfiguracaoEmailError(
                400,
                `Disparador inválido. Use: ${CHAVES_DISPARADOR.join(", ")}.`,
            );
        }

        const limpos: AtualizarConfiguracaoDTO = {};

        if (dados.ativo !== undefined) limpos.ativo = Boolean(dados.ativo);

        for (const campo of ["remetente_nome", "remetente_email", "assunto", "titulo", "mensagem"] as const) {
            const valor = dados[campo];
            if (valor === undefined) continue;

            const texto = String(valor).trim();
            if (!texto) {
                throw new ConfiguracaoEmailError(400, `O campo ${campo} não pode ficar vazio.`);
            }
            if (texto.length > LIMITES[campo]) {
                throw new ConfiguracaoEmailError(
                    400,
                    `O campo ${campo} pode ter no máximo ${LIMITES[campo]} caracteres.`,
                );
            }
            limpos[campo] = texto;
        }

        if (limpos.remetente_email && !FORMATO_EMAIL.test(limpos.remetente_email)) {
            throw new ConfiguracaoEmailError(400, "Informe um e-mail de remetente válido.");
        }

        if (Object.keys(limpos).length === 0) {
            throw new ConfiguracaoEmailError(400, "Informe ao menos um campo para atualizar.");
        }

        const atualizada = await this.repository.atualizar(chave, limpos);
        if (!atualizada) {
            throw new ConfiguracaoEmailError(404, `Disparador ${chave} não encontrado.`);
        }
        return atualizada;
    }
}

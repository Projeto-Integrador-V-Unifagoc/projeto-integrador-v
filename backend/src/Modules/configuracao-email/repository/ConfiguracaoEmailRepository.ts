import { db } from "../../../database/connection";

export const CHAVES_DISPARADOR = [
    "inscricao_recebida",
    "documentacao_aprovada",
    "documentacao_reprovada",
    "recuperacao_senha",
] as const;

export type ChaveDisparador = typeof CHAVES_DISPARADOR[number];

export interface ConfiguracaoEmail {
    id: string;
    chave: ChaveDisparador;
    nome: string;
    descricao: string;
    ativo: boolean;
    remetente_nome: string;
    remetente_email: string;
    assunto: string;
    titulo: string;
    mensagem: string;
    created_at: Date;
    updated_at: Date;
}

export interface AtualizarConfiguracaoDTO {
    ativo?: boolean;
    remetente_nome?: string;
    remetente_email?: string;
    assunto?: string;
    titulo?: string;
    mensagem?: string;
}

export class ConfiguracaoEmailRepository {
    async listar(): Promise<ConfiguracaoEmail[]> {
        return db("configuracao_email").select("*").orderBy("nome");
    }

    async buscarPorChave(chave: string): Promise<ConfiguracaoEmail | null> {
        const linha = await db("configuracao_email").where({ chave }).first();
        return linha ?? null;
    }

    async atualizar(chave: string, dados: AtualizarConfiguracaoDTO): Promise<ConfiguracaoEmail | null> {
        const [linha] = await db("configuracao_email")
            .where({ chave })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha ?? null;
    }
}

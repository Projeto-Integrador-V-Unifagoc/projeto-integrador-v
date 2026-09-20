import { db } from "../../../database/connection";

export interface ConfiguracaoSmtp {
    id: number;
    host: string;
    porta: number;
    seguro: boolean;
    usuario: string;
    senha_cifrada: string;
    remetente_nome: string;
    remetente_email: string;
    ativo: boolean;
    testado_em: string | null;
    resultado_teste: string;
}

export type AtualizarSmtpDTO = Partial<Omit<ConfiguracaoSmtp, "id" | "testado_em" | "resultado_teste">>;

export class ConfiguracaoSmtpRepository {
    async buscar(): Promise<ConfiguracaoSmtp | null> {
        return (await db("configuracao_smtp").where({ id: 1 }).first()) ?? null;
    }

    async atualizar(dados: AtualizarSmtpDTO): Promise<ConfiguracaoSmtp> {
        const [linha] = await db("configuracao_smtp")
            .where({ id: 1 })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");

        return linha;
    }

    async registrarTeste(sucesso: boolean, mensagem: string): Promise<void> {
        await db("configuracao_smtp")
            .where({ id: 1 })
            .update({
                testado_em: db.fn.now(),
                resultado_teste: `${sucesso ? "ok" : "erro"}: ${mensagem}`.slice(0, 400),
            });
    }
}

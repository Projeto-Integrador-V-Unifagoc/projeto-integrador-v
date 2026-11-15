import { db } from "../../../database/connection";

export const PROVEDORES_IA = ["anthropic", "openai", "google"] as const;
export type ProvedorIa = (typeof PROVEDORES_IA)[number];

export interface ConfiguracaoIa {
    id: number;
    provedor: ProvedorIa;
    modelo: string;
    api_key_cifrada: string;
    api_key_final: string;
    ativo: boolean;
    testado_em: string | null;
    resultado_teste: string;
}

export type AtualizarConfiguracaoIaDTO = Partial<
    Pick<ConfiguracaoIa, "provedor" | "modelo" | "api_key_cifrada" | "api_key_final" | "ativo" | "testado_em" | "resultado_teste">
>;

export class ConfiguracaoIaRepository {
    async buscar(): Promise<ConfiguracaoIa | null> {
        return (await db("configuracao_ia").where({ id: 1 }).first()) ?? null;
    }

    async atualizar(dados: AtualizarConfiguracaoIaDTO): Promise<ConfiguracaoIa> {
        const [linha] = await db("configuracao_ia")
            .where({ id: 1 })
            .update({ ...dados, updated_at: db.fn.now() })
            .returning("*");
        return linha;
    }

    async registrarTeste(sucesso: boolean, mensagem: string): Promise<void> {
        await db("configuracao_ia")
            .where({ id: 1 })
            .update({
                testado_em: db.fn.now(),
                resultado_teste: `${sucesso ? "ok" : "erro"}: ${mensagem}`.slice(0, 400),
            });
    }
}

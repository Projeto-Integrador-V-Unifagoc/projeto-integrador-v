import { Knex } from "knex"
import axios from "axios"

const SCHEMA = "piv"

export async function seed(knex: Knex): Promise<void> {
    const { data } = await axios.get(
        "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
    )

    const cidades = data.map((c: any) => {
        const uf =
            c.microrregiao?.mesorregiao?.UF?.sigla ||
            c.regiao_imediata?.regiao_intermediaria?.UF?.sigla ||
            null;

        if (!uf) return null;

        return {
            nome: c.nome,
            uf,
            ibge: String(c.id)
        };
    }).filter(Boolean);

    await knex(`${SCHEMA}.cidade`)
        .insert(cidades)
        .onConflict("ibge")
        .merge(["nome", "uf"])
}

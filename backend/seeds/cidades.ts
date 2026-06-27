import { Knex } from "knex"
import axios from "axios"

const SCHEMA = "piv"
const CIDADES_FALLBACK = [{ nome: "Uba", uf: "MG", ibge: "3171303" }]

export async function seed(knex: Knex): Promise<void> {
    let data: any[] = []

    try {
        const resposta = await axios.get(
            "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
        )
        data = resposta.data
    } catch (error) {
        console.warn("Nao foi possivel carregar cidades do IBGE; usando fallback local.")
    }

    const cidades = (data.length > 0 ? data : CIDADES_FALLBACK).map((c: any) => {
        const uf =
            c.microrregiao?.mesorregiao?.UF?.sigla ||
            c.regiao_imediata?.regiao_intermediaria?.UF?.sigla ||
            c.uf ||
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

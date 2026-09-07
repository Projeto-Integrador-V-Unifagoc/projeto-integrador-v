import { Knex } from "knex"
import axios from "axios"
import { createRequire } from "node:module"

const SCHEMA = "piv"
const TAMANHO_LOTE = 1000
const URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
const TIMEOUT_MS = 20000

const UF_POR_PREFIXO: Record<string, string> = {
    "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
    "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
    "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
    "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
}

interface Cidade {
    nome: string
    uf: string
    ibge: string
}

const exigir = createRequire(__filename)
const CIDADES_LOCAIS: Cidade[] = exigir("./cidades.json")

function normalizar(bruto: unknown): Cidade[] {
    if (!Array.isArray(bruto)) return []

    return bruto
        .map((c: any): Cidade | null => {
            const ibge = String(c?.id ?? c?.ibge ?? "")
            if (!/^\d{7}$/.test(ibge)) return null

            const uf =
                c?.microrregiao?.mesorregiao?.UF?.sigla ||
                c?.regiao_imediata?.regiao_intermediaria?.UF?.sigla ||
                c?.uf ||
                UF_POR_PREFIXO[ibge.slice(0, 2)] ||
                null

            if (!uf || !c?.nome) return null

            return { nome: String(c.nome), uf: String(uf), ibge }
        })
        .filter((c): c is Cidade => c !== null)
}

async function buscarNoIbge(): Promise<Cidade[]> {
    const resposta = await axios.get(URL_IBGE, { timeout: TIMEOUT_MS })
    return normalizar(resposta.data)
}

export async function seed(knex: Knex): Promise<void> {
    let cidades: Cidade[] = []

    try {
        cidades = await buscarNoIbge()
    } catch (error) {
        cidades = []
    }

    if (cidades.length < CIDADES_LOCAIS.length) {
        console.warn(
            `IBGE indisponível ou incompleto (${cidades.length} municípios); usando a lista local com ${CIDADES_LOCAIS.length}.`,
        )
        cidades = CIDADES_LOCAIS
    }

    if (cidades.length === 0) {
        throw new Error("Nenhum município para inserir: verifique backend/seeds/cidades.json.")
    }

    for (let inicio = 0; inicio < cidades.length; inicio += TAMANHO_LOTE) {
        await knex(`${SCHEMA}.cidade`)
            .insert(cidades.slice(inicio, inicio + TAMANHO_LOTE))
            .onConflict("ibge")
            .merge(["nome", "uf"])
    }
}

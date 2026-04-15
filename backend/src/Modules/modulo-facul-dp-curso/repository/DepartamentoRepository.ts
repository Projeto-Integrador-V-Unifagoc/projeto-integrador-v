import { db } from "../../../database/connection"

export class DepartamentoRepository {
    async criarDepartamento(data: any ){
        const departamento = await db("departamento")
            .insert(data)
            .returning("*")
        return departamento[0]
    }

    async listarDepartamentos() {
        const rows = await db("departamento")
            .join("faculdade", "departamento.faculdade_id", "=", "faculdade.id")
            .join("cidade", "faculdade.cidade_id", "=", "cidade.ibge")
            .select(
                "departamento.*", 
                "faculdade.id as fac_id",
                "faculdade.nome as fac_nome",
                "faculdade.logradouro as fac_log",
                "faculdade.numero as fac_num",
                "faculdade.bairro as fac_bairro",
                "faculdade.cep as fac_cep",
                "cidade.id as cid_id",
                "cidade.nome as cid_nome",
                "cidade.uf as cid_uf",
                "cidade.ibge as cid_ibge"
            );


        return rows.map(row => ({
            id: row.id,
            nome: row.nome,
            codigo: row.codigo,
            faculdade: {
                id: row.fac_id,
                nome: row.fac_nome,
                logradouro: row.fac_log,
                numero: row.fac_num,
                bairro: row.fac_bairro,
                cep: row.fac_cep,
                cidade: {
                    id: row.cid_id,
                    nome: row.cid_nome,
                    uf: row.cid_uf,
                    ibge: row.cid_ibge
                }
            }
        }));
    }

    async buscarDepartamentoPorId(id: string) {
        const row = await db("departamento")
            .join("faculdade", "departamento.faculdade_id", "=", "faculdade.id")
            .join("cidade", "faculdade.cidade_id", "=", "cidade.ibge")
            .where("departamento.id", id)
            .select(
                "departamento.*",
                "faculdade.id as fac_id",
                "faculdade.nome as fac_nome",
                "faculdade.logradouro as fac_log",
                "faculdade.numero as fac_num",
                "faculdade.bairro as fac_bairro",
                "faculdade.cep as fac_cep",
                "cidade.id as cid_id",
                "cidade.nome as cid_nome",
                "cidade.uf as cid_uf",
                "cidade.ibge as cid_ibge"
            )
            .first();

        if (!row) return null;

        return {
            id: row.id,
            nome: row.nome,
            codigo: row.codigo,
            faculdade: {
                id: row.fac_id,
                nome: row.fac_nome,
                logradouro: row.fac_log,
                numero: row.fac_num,
                bairro: row.fac_bairro,
                cep: row.fac_cep,
                cidade: {
                    id: row.cid_id,
                    nome: row.cid_nome,
                    uf: row.cid_uf,
                    ibge: row.cid_ibge
                }
            }
        };
    }
}
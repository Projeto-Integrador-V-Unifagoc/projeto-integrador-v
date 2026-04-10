import { db } from "../../../database/connection"

export class CursoRepository {
    async criarCurso(data: any ){
        const curso = await db("curso")
            .insert(data)
            .returning("*")
        return curso[0]
    }

    async listarCursos() {
        const rows = await db("curso")
            .join("departamento", "curso.departamento_id", "=", "departamento.id")
            .join("faculdade", "departamento.faculdade_id", "=", "faculdade.id")
            .join("cidade", "faculdade.cidade_id", "=", "cidade.ibge")
            .select(
                "curso.*",
                "departamento.id as dep_id",
                "departamento.nome as dep_nome",
                "departamento.codigo as dep_codigo",
                "faculdade.id as fac_id",
                "faculdade.nome as fac_nome",
                "faculdade.logradouro as fac_logradouro",
                "faculdade.numero as fac_numero",
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
            departamento: {
                id: row.dep_id,
                nome: row.dep_nome,
                codigo: row.dep_codigo,
                faculdade: {
                    id: row.fac_id,
                    nome: row.fac_nome,
                    logradouro: row.fac_logradouro,
                    numero: row.fac_numero,
                    bairro: row.fac_bairro,
                    cep: row.fac_cep,
                    cidade: {
                        id: row.cid_id,
                        nome: row.cid_nome,
                        uf: row.cid_uf,
                        ibge: row.cid_ibge
                    }
                }
            }
        }));
    }

    async buscarCursoPorId(id: string) {
        const row = await db("curso")
            .join("departamento", "curso.departamento_id", "=", "departamento.id")
            .join("faculdade", "departamento.faculdade_id", "=", "faculdade.id")
            .join("cidade", "faculdade.cidade_id", "=", "cidade.ibge")
            .where("curso.id", id)
            .select(
                "curso.*",
                "departamento.id as dep_id",
                "departamento.nome as dep_nome",
                "departamento.codigo as dep_codigo",
                "faculdade.id as fac_id",
                "faculdade.nome as fac_nome",
                "faculdade.logradouro as fac_logradouro",
                "faculdade.numero as fac_numero",
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
            departamento: {
                id: row.dep_id,
                nome: row.dep_nome,
                codigo: row.dep_codigo, 
                faculdade: {
                    id: row.fac_id,
                    nome: row.fac_nome,
                    logradouro: row.fac_logradouro,
                    numero: row.fac_numero,
                    bairro: row.fac_bairro,
                    cep: row.fac_cep,
                    cidade: {
                        id: row.cid_id,
                        nome: row.cid_nome,
                        uf: row.cid_uf,
                        ibge: row.cid_ibge
                    }
                }
            }
        };
    }
}
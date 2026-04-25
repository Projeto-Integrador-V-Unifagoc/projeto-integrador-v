import { db } from "../../../database/connection";
import { AlunoCommand, AlunoMapper } from "../models/Aluno";

export class AlunoRepository {
    async criarAluno(aluno: AlunoCommand, trx?: any) {
    const query = trx || db;

    const [novoAluno] = await query("aluno")
        .insert(aluno)
        .returning("*");

    return novoAluno;
}

    async listarAlunos() {
        const rows = await db("aluno")
            .join("pessoa", "aluno.pessoa_id", "=", "pessoa.id")
            .leftJoin("usuario", "aluno.usuario_id", "=", "usuario.id")
            .leftJoin("cidade", "pessoa.cidade_id", "=", "cidade.ibge")
            .select(
                "aluno.*",
                "pessoa.id as p_id", 
                "pessoa.nome as p_nome",
                "pessoa.cpf as p_cpf",
                "pessoa.data_nascimento as p_data_nascimento",
                "pessoa.logradouro as p_logradouro",
                "pessoa.numero as p_numero",
                "pessoa.bairro as p_bairro",
                "pessoa.estado as p_estado",
                "pessoa.cep as p_cep",
                "usuario.id as u_id",
                "usuario.email as u_email",
                "cidade.id as c_id",          
                "cidade.ibge as c_ibge",      
                "cidade.nome as c_nome",
                "cidade.uf as c_uf"
            );

        return rows.map(AlunoMapper.toDomain);
    }

    async buscarAlunoPorId(id: string) {
        const row = await db("aluno")
            .join("pessoa", "aluno.pessoa_id", "=", "pessoa.id")
            .leftJoin("usuario", "aluno.usuario_id", "=", "usuario.id")
            .leftJoin("cidade", "pessoa.cidade_id", "=", "cidade.ibge")
            .where("aluno.id", id)
            .select(
                "aluno.*",
                "pessoa.id as p_id", 
                "pessoa.nome as p_nome",
                "pessoa.cpf as p_cpf",
                "pessoa.data_nascimento as p_data_nascimento",
                "pessoa.logradouro as p_logradouro",
                "pessoa.numero as p_numero",
                "pessoa.bairro as p_bairro",
                "pessoa.estado as p_estado",
                "pessoa.cep as p_cep",
                "usuario.id as u_id",
                "usuario.email as u_email",
                "cidade.id as c_id",          
                "cidade.ibge as c_ibge",      
                "cidade.nome as c_nome",
                "cidade.uf as c_uf"
            )
            .first();

        return row ? AlunoMapper.toDomain(row) : null;
    }

    async buscarAlunoPorMatricula(matricula: string) {
        const row = await db("aluno")
            .join("pessoa", "aluno.pessoa_id", "=", "pessoa.id")
            .leftJoin("usuario", "aluno.usuario_id", "=", "usuario.id")
            .leftJoin("cidade", "pessoa.cidade_id", "=", "cidade.ibge")
            .where("aluno.matricula", matricula)
            .select(
                "aluno.*",
                "pessoa.id as p_id", 
                "pessoa.nome as p_nome",
                "pessoa.cpf as p_cpf",
                "pessoa.data_nascimento as p_data_nascimento",
                "pessoa.logradouro as p_logradouro",
                "pessoa.numero as p_numero",
                "pessoa.bairro as p_bairro",
                "pessoa.estado as p_estado",
                "pessoa.cep as p_cep",
                "usuario.id as u_id",
                "usuario.email as u_email",
                "cidade.id as c_id",          
                "cidade.ibge as c_ibge",      
                "cidade.nome as c_nome",
                "cidade.uf as c_uf"
            )
            .first();

        return row ? AlunoMapper.toDomain(row) : null;
    }
    async atualizarAluno(matricula: string, dados: any) {
        await db("pessoa")
            .join("aluno", "aluno.pessoa_id", "=", "pessoa.id")
            .where("aluno.matricula", matricula)
            .update({
                nome: dados.pessoa.nome,
                cpf: dados.pessoa.cpf,
                data_nascimento: dados.pessoa.dataNascimento,
                logradouro: dados.pessoa.logradouro,
                numero: dados.pessoa.numero,
                bairro: dados.pessoa.bairro,
                cidade_id: dados.pessoa.cidadeIbge,
                estado: dados.pessoa.estado,
                cep: dados.pessoa.cep
        });

    await db("aluno")
        .where("matricula", matricula)
        .update({
            curso_id: dados.curso,
            periodo: dados.periodo
        });

    return this.buscarAlunoPorMatricula(matricula);
}
}
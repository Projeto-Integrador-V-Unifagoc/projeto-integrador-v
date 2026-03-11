import { db } from "../../../database/connection";
import { Aluno } from "../models/Aluno";

export class AlunoRepository {
    async criarAluno(data: Aluno) {
        const aluno = await db("alunos")
            .insert(data)
            .returning("*")

        return aluno[0]
    }
}

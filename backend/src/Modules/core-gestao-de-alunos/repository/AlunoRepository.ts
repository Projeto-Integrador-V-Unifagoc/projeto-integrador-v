import { db } from "../../../database/connection";
import { Aluno } from "../models/Aluno";

export class AlunoRepository {
  async criarAluno(data: Aluno) {
    const aluno = await db("alunos").insert(data).returning("*");

    return aluno[0];
  }

  async listarAlunos() {
    const alunos = await db("alunos").select("*");
    return alunos;
  }

  async buscarAlunoPorMatricula(matricula: string) {
    const aluno = await db("alunos").select("*").where("matricula", matricula);
    return aluno[0];
  }
}

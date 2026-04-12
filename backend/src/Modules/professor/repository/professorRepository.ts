import db from '../../database';
import { Professor } from '../models/professorModels';

export class ProfessorRepository{
  async criarProfessor(data: Professor){
    const professor = await db("professores")
      .insert(data)
      .returning("*");

    return professor[0];
  }
}
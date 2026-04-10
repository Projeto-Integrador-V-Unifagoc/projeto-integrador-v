import { CursoCommand } from "../models/Curso";
import { CursoRepository } from "../repository/CursoRepository";
import { v4 as uuidv4 } from 'uuid';

export class CursoService {
    cursoRepository = new CursoRepository();

    async criarCurso(data: any){
        let curso: CursoCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            departamento_id: data.departamentoId
        }
        return await this.cursoRepository.criarCurso(curso)
    }

    async listarCursos(){
        return await this.cursoRepository.listarCursos()
    }

    async buscarCursoPorId(id: string) {
        return await this.cursoRepository.buscarCursoPorId(id)
    }
}
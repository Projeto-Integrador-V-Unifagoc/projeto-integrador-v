import { DepartamentoRepository } from "../repository/DepartamentoRepository";
import { DepartamentoCommand } from "../models/Departamento";
import { v4 as uuidv4 } from 'uuid';


export class DepartamentoService {
    departamentoRepository = new DepartamentoRepository();

    async criarDepartamento(data: any){
        let departamento : DepartamentoCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            faculdade_id: data.faculdadeId
        }
        return await this.departamentoRepository.criarDepartamento(departamento)
    }

    async listarDepartamentos(){
        return await this.departamentoRepository.listarDepartamentos()
    }

    async buscarDepartamentoPorId(id: string) {
        return await this.departamentoRepository.buscarDepartamentoPorId(id)
    }
}
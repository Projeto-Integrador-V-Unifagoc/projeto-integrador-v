import { FaculdadeCommand } from "../models/Faculdade";
import { FaculdadeRepository } from "../repository/FaculdadeRepository";
import { v4 as uuidv4 } from 'uuid';

export class FaculdadeService {
    faculdadeRepository = new FaculdadeRepository();

    async criarFaculdade(data: any){

        let faculdade : FaculdadeCommand = {
            id: uuidv4(),
            nome: data.nome,
            cidade_id: data.cidadeIbge,
            logradouro: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            cep: data.cep
        }

        return await this.faculdadeRepository.criarFaculdade(faculdade)
    }

    async listarFaculdades(){
        return await this.faculdadeRepository.listarFaculdades()
    }

    async buscarFaculdadePorId(id: string) {
        return await this.faculdadeRepository.buscarFaculdadePorId(id)
    }
}
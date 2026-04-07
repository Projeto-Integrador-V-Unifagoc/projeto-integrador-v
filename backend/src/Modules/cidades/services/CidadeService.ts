import { CidadeRepository } from "../repository/CidadeRepository";

export class CidadeService {
    private cidadeRepository = new CidadeRepository()
    
    async listarCidades() {
        const cidades = await this.cidadeRepository.listarCidades()
        return cidades
    }
}
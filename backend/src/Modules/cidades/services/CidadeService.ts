import { CidadeRepository } from "../repository/CidadeRepository";

export class CidadeService {
    private cidadeRepository = new CidadeRepository()
    
    async listarCidades(filtros?: { ibge?: string }) {
        return this.cidadeRepository.listarCidades(filtros)
    }
}
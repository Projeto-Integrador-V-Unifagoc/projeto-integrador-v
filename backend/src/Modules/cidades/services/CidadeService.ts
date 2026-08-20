import { CidadeRepository } from "../repository/CidadeRepository";

export class CidadeService {
    private cidadeRepository = new CidadeRepository()
    
    async listarCidades(filtros?: { ibge?: string, nome?: string }) {
        return this.cidadeRepository.listarCidades(filtros)
    }

    async buscarCidadePorIbge(ibge: string) {
        return this.cidadeRepository.buscarCidadePorIbge(ibge)
    }
}
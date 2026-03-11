import type { Avaliacao } from "../models/interface.js";
import { AvaliacaoRepository } from "../repository/avaliacao-repository.js";

export class AvaliacaoService {

  async atualizar(id: number, dados: any) {

    if (dados.nota && (dados.nota < 0 || dados.nota > 10)) {
      throw new Error("Nota inválida");
    }

    return AvaliacaoRepository.atualizar(id, dados);

  }

}



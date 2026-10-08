import type { Knex } from "knex";
import type { FrequenciaRepository } from "../repository/FrequenciaRepository";
import { consolidarFrequencia, type FrequenciaConsolidada } from "../service/FrequenciaConsolidada";

/** Recebe matrículas já autorizadas e usa o snapshot do serviço que compõe a leitura. */
export class FrequenciaConsolidadaGateway {
  constructor(private readonly repository: Pick<FrequenciaRepository, "carregarContagensPorMatriculas">) {}

  async carregar(matriculaTurmaDisciplinaIds: string[], executor: Knex | Knex.Transaction): Promise<Map<string, FrequenciaConsolidada>> {
    const ids = [...new Set(matriculaTurmaDisciplinaIds)];
    if (!ids.length) return new Map();
    const contagens = await this.repository.carregarContagensPorMatriculas(ids, executor);
    const porMatricula = new Map(contagens.map((linha) => [linha.matricula_turma_disciplina_id, linha]));
    return new Map(ids.map((id) => {
      const linha = porMatricula.get(id);
      return [id, consolidarFrequencia(Number(linha?.presencas ?? 0), Number(linha?.faltas ?? 0))];
    }));
  }
}

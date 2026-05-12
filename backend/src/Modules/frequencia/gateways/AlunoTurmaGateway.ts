import { FrequenciaRepository } from "../repository/FrequenciaRepository";

export class AlunoTurmaGateway {
  constructor(private repository = new FrequenciaRepository()) {}

  async listarAlunosAtivos(turmaId: string) {
    return this.repository.listarAlunosAtivosDaTurma(turmaId);
  }
}

import { ContextoAutenticado } from "../models/Frequencia";
import { FrequenciaRepository } from "../repository/FrequenciaRepository";

export class ProfessorTurmaGateway {
  constructor(private repository = new FrequenciaRepository()) {}

  async validarVinculo(contexto: ContextoAutenticado, turmaId: string) {
    if (contexto.perfil === "COORDENADOR") return true;
    if (contexto.perfil !== "PROFESSOR" || !contexto.professorId) return false;

    return this.repository.professorPossuiTurma(contexto.professorId, turmaId);
  }
}

import { v4 as uuidv4 } from "uuid";
import { HorarioOfertaRepository } from "../repository/HorarioOfertaRepository";

export class HorarioOfertaService {
  repository = new HorarioOfertaRepository();
  listarPorTurma(turmaId: string) { return this.repository.listarPorTurma(turmaId); }
  listarPorOferta(ofertaId: string) { return this.repository.listarPorOferta(ofertaId); }

  async criar(ofertaId: string, entrada: any) {
    return this.repository.criar({ id: uuidv4(), turma_disciplina_id: ofertaId, ...this.validar(entrada) });
  }

  async atualizar(id: string, entrada: any) {
    const atual = await this.repository.buscarPorId(id);
    if (!atual) throw Object.assign(new Error("Horario nao encontrado"), { status: 404 });
    return this.repository.atualizar(id, {
      id, turma_disciplina_id: String(atual.turma_disciplina_id),
      ...this.validar({
        diaSemana: entrada.diaSemana ?? atual.dia_semana,
        horaInicio: entrada.horaInicio ?? String(atual.hora_inicio).slice(0, 5),
        horaFim: entrada.horaFim ?? String(atual.hora_fim).slice(0, 5),
        local: entrada.local !== undefined ? entrada.local : atual.local,
        vigenciaInicio: entrada.vigenciaInicio ?? this.dataIso(atual.vigencia_inicio),
        vigenciaFim: entrada.vigenciaFim ?? this.dataIso(atual.vigencia_fim),
        ativo: entrada.ativo ?? atual.ativo,
      }),
    });
  }

  async remover(id: string) {
    if (!await this.repository.remover(id)) throw Object.assign(new Error("Horario nao encontrado"), { status: 404 });
  }

  private validar(entrada: any) {
    const dia = Number(entrada.diaSemana);
    const inicio = String(entrada.horaInicio ?? "");
    const fim = String(entrada.horaFim ?? "");
    const vigenciaInicio = this.validarData(entrada.vigenciaInicio);
    const vigenciaFim = this.validarData(entrada.vigenciaFim);
    if (!Number.isInteger(dia) || dia < 1 || dia > 7) throw Object.assign(new Error("Dia da semana deve estar entre 1 e 7"), { status: 400 });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fim) || fim <= inicio) {
      throw Object.assign(new Error("Informe uma faixa de horario valida"), { status: 400 });
    }
    if (vigenciaFim < vigenciaInicio) throw Object.assign(new Error("Fim da vigencia deve ser igual ou posterior ao inicio"), { status: 400 });
    const local = String(entrada.local ?? "").trim().replace(/\s+/g, " ");
    if (local.length > 120) throw Object.assign(new Error("Local deve ter ate 120 caracteres"), { status: 400 });
    return { dia_semana: dia, hora_inicio: inicio, hora_fim: fim, local: local || null, vigencia_inicio: vigenciaInicio, vigencia_fim: vigenciaFim, ativo: entrada.ativo !== false };
  }

  private validarData(valor: unknown) {
    const texto = String(valor ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(new Date(`${texto}T12:00:00`).getTime())) {
      throw Object.assign(new Error("Informe uma vigencia valida"), { status: 400 });
    }
    return texto;
  }
  private dataIso(valor: unknown) { return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10); }
}

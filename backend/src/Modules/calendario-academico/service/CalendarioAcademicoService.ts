import { v4 as uuidv4 } from "uuid";
import type { EventoAcademicoCommand, OcorrenciaAulaPlanejada, TipoEventoAcademico } from "../models/CalendarioAcademico";
import { CalendarioAcademicoRepository } from "../repository/CalendarioAcademicoRepository";

const TIPOS = new Set<TipoEventoAcademico>(["FERIADO", "RECESSO", "SUSPENSAO", "EVENTO"]);

export class CalendarioAcademicoService {
  repository = new CalendarioAcademicoRepository();

  async listar(periodoId: string) {
    const periodo = await this.periodo(periodoId);
    return { periodo: this.mapearPeriodo(periodo), eventos: await this.repository.listarEventos(periodoId) };
  }

  async criarEvento(periodoId: string, entrada: any) {
    const periodo = await this.periodo(periodoId);
    return this.repository.criarEvento({ id: uuidv4(), periodo_letivo_id: periodoId, ...this.validarEvento(entrada, periodo) });
  }

  async atualizarEvento(id: string, entrada: any) {
    const atual = await this.repository.buscarEvento(id);
    if (!atual) throw this.erro("Evento academico nao encontrado", 404);
    const periodo = await this.periodo(String(atual.periodo_letivo_id));
    return this.repository.atualizarEvento(id, this.validarEvento({
      tipo: entrada.tipo ?? atual.tipo,
      titulo: entrada.titulo ?? atual.titulo,
      descricao: entrada.descricao !== undefined ? entrada.descricao : atual.descricao,
      dataInicio: entrada.dataInicio ?? this.iso(atual.data_inicio),
      dataFim: entrada.dataFim ?? this.iso(atual.data_fim),
      bloqueiaAulas: entrada.bloqueiaAulas ?? atual.bloqueia_aulas,
    }, periodo));
  }

  async removerEvento(id: string) {
    if (!await this.repository.removerEvento(id)) throw this.erro("Evento academico nao encontrado", 404);
  }

  async gerarAulas(periodoId: string, entrada: any = {}) {
    const periodo = await this.periodo(periodoId);
    const inicio = entrada.dataInicio ? this.data(entrada.dataInicio) : this.iso(periodo.data_inicio);
    const fim = entrada.dataFim ? this.data(entrada.dataFim) : this.iso(periodo.data_fim);
    if (inicio < this.iso(periodo.data_inicio) || fim > this.iso(periodo.data_fim) || fim < inicio) throw this.erro("Intervalo de geracao fora do periodo letivo", 400);
    const [horarios, eventos, existentes] = await Promise.all([
      this.repository.listarHorarios(periodoId),
      this.repository.listarEventos(periodoId),
      this.repository.listarAulasGeradas(periodoId, { inicio, fim }),
    ]);
    const { ocorrencias, excluidas } = this.calcularOcorrencias(horarios as any[], eventos as any[], inicio, fim);
    const chavesExistentes = new Set((existentes as any[]).map((a) => `${a.horario_turma_disciplina_id}:${this.iso(a.data)}`));
    const resumoBase = {
      periodo: this.mapearPeriodo(periodo), intervalo: { inicio, fim }, horariosAtivos: horarios.length,
      ocorrenciasPrevistas: ocorrencias.length, excluidasPorCalendario: excluidas,
      novas: ocorrencias.filter((item) => !chavesExistentes.has(`${item.horarioId}:${item.data}`)).length,
      existentes: ocorrencias.filter((item) => chavesExistentes.has(`${item.horarioId}:${item.data}`)).length,
    };
    if (entrada.simular !== false) return { simulado: true, ...resumoBase };
    return { simulado: false, ...resumoBase, ...(await this.repository.sincronizarAulas(periodoId, ocorrencias, { inicio, fim })) };
  }

  calcularOcorrencias(horarios: any[], eventos: any[], inicio: string, fim: string) {
    const ocorrencias: OcorrenciaAulaPlanejada[] = [];
    let excluidas = 0;
    for (const horario of horarios) {
      const primeiro = [inicio, this.iso(horario.vigencia_inicio)].sort().at(-1)!;
      const ultimo = [fim, this.iso(horario.vigencia_fim)].sort()[0];
      if (ultimo < primeiro) continue;
      for (let data = primeiro; data <= ultimo; data = this.somarDia(data)) {
        if (this.diaSemana(data) !== Number(horario.dia_semana)) continue;
        const bloqueado = eventos.some((evento) => Boolean(evento.bloqueia_aulas) && data >= this.iso(evento.data_inicio) && data <= this.iso(evento.data_fim));
        if (bloqueado) { excluidas += 1; continue; }
        ocorrencias.push({
          horarioId: String(horario.id), turmaDisciplinaId: String(horario.turma_disciplina_id),
          professorId: String(horario.professor_id), data,
          horaInicio: String(horario.hora_inicio).slice(0, 5), horaFim: String(horario.hora_fim).slice(0, 5),
          local: horario.local ? String(horario.local) : null,
        });
      }
    }
    return { ocorrencias, excluidas };
  }

  private validarEvento(entrada: any, periodo: any): Omit<EventoAcademicoCommand, "id" | "periodo_letivo_id"> {
    const tipo = String(entrada.tipo ?? "").toUpperCase() as TipoEventoAcademico;
    const titulo = String(entrada.titulo ?? "").trim();
    const descricao = String(entrada.descricao ?? "").trim() || null;
    const dataInicio = this.data(entrada.dataInicio);
    const dataFim = this.data(entrada.dataFim);
    if (!TIPOS.has(tipo)) throw this.erro("Tipo de evento academico invalido", 400);
    if (titulo.length < 3 || titulo.length > 160) throw this.erro("Titulo deve ter entre 3 e 160 caracteres", 400);
    if (dataFim < dataInicio) throw this.erro("Data final deve ser igual ou posterior a inicial", 400);
    if (dataInicio < this.iso(periodo.data_inicio) || dataFim > this.iso(periodo.data_fim)) throw this.erro("Evento deve permanecer dentro do periodo letivo", 400);
    return { tipo, titulo, descricao, data_inicio: dataInicio, data_fim: dataFim, bloqueia_aulas: entrada.bloqueiaAulas !== false };
  }

  private async periodo(id: string) { const item = await this.repository.buscarPeriodo(id); if (!item) throw this.erro("Periodo letivo nao encontrado", 404); return item; }
  private mapearPeriodo(item: any) { return { id: String(item.id), codigo: item.codigo, dataInicio: this.iso(item.data_inicio), dataFim: this.iso(item.data_fim), status: item.status }; }
  private data(valor: unknown) { const texto = String(valor ?? ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw this.erro("Data invalida", 400); const [ano, mes, dia] = texto.split("-").map(Number); if (new Date(Date.UTC(ano, mes - 1, dia)).toISOString().slice(0, 10) !== texto) throw this.erro("Data invalida", 400); return texto; }
  private iso(valor: unknown) { return valor instanceof Date ? this.dataLocal(valor) : String(valor).slice(0, 10); }
  private dataLocal(valor: Date) { const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(valor); const obter = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? ""; return `${obter("year")}-${obter("month")}-${obter("day")}`; }
  private somarDia(data: string) { const valor = new Date(`${data}T12:00:00Z`); valor.setUTCDate(valor.getUTCDate() + 1); return valor.toISOString().slice(0, 10); }
  private diaSemana(data: string) { const dia = new Date(`${data}T12:00:00Z`).getUTCDay(); return dia === 0 ? 7 : dia; }
  private erro(message: string, status: number) { return Object.assign(new Error(message), { status }); }
}

import type { Request } from "express";
import { AuthContextGateway } from "../gateways/AuthContextGateway";
import { erroFrequencia, FrequenciaError } from "../errors/FrequenciaError";
import type { ConsolidadoFrequencia, JustificativaRequest, RegistrarFrequenciaRequest, StatusFrequencia } from "../models/Frequencia";
import { FrequenciaRepository } from "../repository/FrequenciaRepository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export class FrequenciaService {
  constructor(private repository = new FrequenciaRepository(), private auth = new AuthContextGateway(repository)) {}

  async listarOpcoes(req: Request) {
    const ctx = await this.auth.obterContexto(req);
    const turmas = await this.repository.listarTurmas(ctx.professorId, ctx.alunoId);
    return {
      contexto: { perfil: ctx.perfil },
      turmas: turmas.map((t: any) => ({ id: t.id, turmaDisciplinaId: t.id, turmaId: t.turma_id, sigla: t.turma_sigla,
        descricao: t.turma_descricao, periodoLetivo: { codigo: t.periodo_codigo, dataInicio: this.iso(t.data_inicio), dataFim: this.iso(t.data_fim), status: t.periodo_status },
        disciplina: { id: t.disciplina_id, codigo: t.disciplina_codigo, nome: t.disciplina_nome }, curso: { id: t.curso_id, nome: t.curso_nome } })),
      locais: ctx.perfil === "professor" ? await this.repository.listarLocais() : [],
    };
  }

  async obterChamada(turmaId: string, data: string, req: Request) {
    this.uuid(turmaId, "Turma/disciplina inválida."); this.data(data);
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroFrequencia.proibido();
    await this.autorizarTurma(ctx, turmaId, ctx.perfil === "secretaria");
    const turma = await this.validarPeriodo(turmaId, data, false);
    const alunos = await this.repository.listarAlunosAtivosDaTurma(turmaId);
    const registros = await this.repository.listarRegistrosDaChamada(turmaId, data);
    const porMatricula = new Map(registros.map((r: any) => [String(r.matricula_turma_disciplina_id), r]));
    return { turmaDisciplinaId: turmaId, data, periodoLetivo: turma.periodo_codigo, jaRegistrada: registros.length > 0,
      chamadaCompleta: registros.length === alunos.length, matriculasIrregulares: await this.repository.contarMatriculasIrregulares(turmaId),
      alunos: await Promise.all(alunos.map(async (a: any) => { const r: any = porMatricula.get(String(a.matricula_turma_disciplina_id)); return {
        id: a.aluno_id, matriculaTurmaDisciplinaId: a.matricula_turma_disciplina_id, matricula: a.matricula, nome: a.nome,
        statusMatricula: a.status, percentualAtual: await this.repository.calcularPercentualMatriculaTurmaDisciplina(a.matricula_turma_disciplina_id),
        frequenciaId: r?.id, status: r?.status || null, motivoJustificativa: r?.justificativa_motivo || r?.justificativa || "", observacaoJustificativa: r?.justificativa_observacao || "",
      }; })) };
  }

  async salvarChamada(payload: RegistrarFrequenciaRequest, req: Request) {
    this.validarPayload(payload); const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil !== "professor" || !ctx.professorId) throw erroFrequencia.proibido("Somente o professor responsável pode salvar a chamada.");
    await this.autorizarTurma(ctx, payload.turmaDisciplinaId); await this.validarPeriodo(payload.turmaDisciplinaId, payload.data, true);
    const elegiveis = await this.repository.listarAlunosAtivosDaTurma(payload.turmaDisciplinaId);
    const elegiveisPorAluno = new Map(elegiveis.map((a: any) => [String(a.aluno_id), a]));
    const recebidos = new Set(payload.registros.map((r) => r.alunoId));
    if (recebidos.size !== payload.registros.length) throw erroFrequencia.invalido("A chamada contém aluno duplicado.");
    if (recebidos.size !== elegiveis.length || [...recebidos].some((id) => !elegiveisPorAluno.has(id))) throw erroFrequencia.invalido("A chamada deve conter exatamente todos os alunos com matrícula ativa.");
    try {
      const salvo = await this.repository.salvarChamadaAtomica({ turmaDisciplinaId: payload.turmaDisciplinaId, aulaId: payload.aulaId,
        localId: payload.localId, data: payload.data, professorId: ctx.professorId, usuarioId: ctx.usuarioId, perfil: ctx.perfil,
        registros: payload.registros.map((r) => ({ matriculaId: (elegiveisPorAluno.get(r.alunoId) as any).matricula_turma_disciplina_id, status: r.status })) });
      return { mensagem: "Chamada salva com sucesso.", ...salvo };
    } catch (e: any) {
      if (e instanceof FrequenciaError) throw e;
      if (e?.code === "23505") throw erroFrequencia.conflito("Já existe uma chamada para esta turma e data.");
      if (e?.codigoDominio === "PRAZO_EXPIRADO") throw erroFrequencia.conflito(e.message);
      if (e?.codigoDominio) throw erroFrequencia.invalido(e.message);
      throw e;
    }
  }
  registrarFrequencia(payload: RegistrarFrequenciaRequest, req: Request) { return this.salvarChamada(payload, req); }

  async registrarJustificativa(id: string, dados: JustificativaRequest, req: Request) {
    this.uuid(id, "Frequência inválida."); const motivo = String(dados?.motivo || "").trim(); const observacao = String(dados?.observacao || "").trim();
    if (motivo.length < 3 || motivo.length > 200) throw erroFrequencia.invalido("O motivo deve ter entre 3 e 200 caracteres.");
    if (observacao.length > 1000) throw erroFrequencia.invalido("A observação deve ter no máximo 1000 caracteres.");
    const ctx = await this.auth.obterContexto(req); if (ctx.perfil === "secretaria") throw erroFrequencia.proibido();
    const registro: any = await this.repository.buscarRegistroPorId(id); if (!registro) throw erroFrequencia.naoEncontrado("Registro de frequência não encontrado.");
    if (registro.status !== "AUSENTE") throw erroFrequencia.invalido("Justificativa só pode ser informada para ausência.");
    if (ctx.perfil === "aluno" && registro.alunoId !== ctx.alunoId) throw erroFrequencia.proibido();
    if (ctx.perfil === "professor") await this.autorizarTurma(ctx, registro.turmaDisciplinaId);
    if (registro.motivoJustificativa && !dados.confirmarSubstituicao) throw erroFrequencia.conflito("Já existe justificativa. Confirme a substituição.");
    return { mensagem: "Justificativa salva sem alterar o percentual de frequência.", registro: await this.repository.salvarJustificativa(id, { motivo, observacao, usuarioId: ctx.usuarioId, perfil: ctx.perfil }) };
  }

  async minhaFrequencia(req: Request) {
    const ctx = await this.auth.obterContexto(req); if (ctx.perfil !== "aluno" || !ctx.alunoId) throw erroFrequencia.proibido();
    return this.consultarAlunoInterno(ctx.alunoId);
  }
  async consultarAluno(alunoId: string, req?: Request) {
    this.uuid(alunoId, "Aluno invalido.");
    if (!req) return this.consultarAlunoInterno(alunoId);
    this.uuid(alunoId, "Aluno inválido."); const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno" && ctx.alunoId !== alunoId) throw erroFrequencia.proibido();
    if (ctx.perfil === "professor" && (!ctx.professorId || !(await this.repository.professorPossuiAluno(ctx.professorId, alunoId)))) throw erroFrequencia.proibido("Aluno fora das atribuições do professor.");
    return this.consultarAlunoInterno(alunoId, ctx.perfil === "professor" ? ctx.professorId : undefined);
  }
  private async consultarAlunoInterno(alunoId: string, professorId?: string) {
    const historico: any[] = await this.repository.listarHistoricoAluno(alunoId, professorId);
    const grupos = new Map<string, any>();
    for (const r of historico) { const g = grupos.get(r.turma_disciplina_id) || { alunoId, alunoNome: r.aluno_nome, turmaDisciplinaId: r.turma_disciplina_id, disciplinaId: r.disciplina_id, disciplinaNome: r.disciplina_nome, totalAulas: 0, presencas: 0, faltas: 0, naoLancadas: 0 }; g.totalAulas++; g.presencas += r.status === "PRESENTE" ? 1 : 0; g.faltas += r.status === "AUSENTE" ? 1 : 0; grupos.set(r.turma_disciplina_id, g); }
    const consolidado = [...grupos.values()].map((g) => this.consolidar(g));
    return { alunoId, possuiAlerta: consolidado.some((c) => c.percentual !== null && c.percentual <= 80), consolidado,
      historico: historico.map((r) => ({ id: r.id, aulaId: r.aula_id, turmaDisciplinaId: r.turma_disciplina_id, disciplinaId: r.disciplina_id, disciplinaNome: r.disciplina_nome, data: this.iso(r.data), status: r.status, motivoJustificativa: r.justificativa_motivo || r.justificativa, observacaoJustificativa: r.justificativa_observacao })) };
  }

  async consultarTurma(id: string, req: Request, filtros: any = {}) {
    this.uuid(id, "Turma/disciplina inválida."); const ctx = await this.auth.obterContexto(req); if (ctx.perfil === "aluno") throw erroFrequencia.proibido();
    await this.autorizarTurma(ctx, id, ctx.perfil === "secretaria"); this.filtros(filtros);
    const turma: any = await this.repository.buscarTurma(id);
    if (!turma) throw erroFrequencia.naoEncontrado("Turma/disciplina não encontrada.");
    if ((filtros.dataInicio && filtros.dataInicio < this.iso(turma.data_inicio)) || (filtros.dataFim && filtros.dataFim > this.iso(turma.data_fim))) throw erroFrequencia.invalido("O intervalo deve pertencer ao período letivo da turma.");
    const { totalAulas, rows } = await this.repository.buscarConsolidadoTurma(id, filtros);
    const alunos = rows.map((r: any) => this.consolidar({ alunoId: r.aluno_id, alunoNome: r.aluno_nome, turmaDisciplinaId: r.turma_disciplina_id, disciplinaId: r.disciplina_id, disciplinaNome: r.disciplina_nome, totalAulas, presencas: Number(r.presencas), faltas: Number(r.faltas), naoLancadas: Math.max(totalAulas - Number(r.registros), 0) }));
    return { turmaDisciplinaId: id, totalAulas, matriculasIrregulares: await this.repository.contarMatriculasIrregulares(id), alunos,
      alunosEmRisco: alunos.filter((a: any) => a.situacao === "RISCO_REPROVACAO"), alunosEmAlerta: alunos.filter((a: any) => a.situacao === "ALERTA") };
  }
  async gerarRelatorio(f: any, req: Request) { const id = String(f.turmaDisciplinaId || ""); if (!id) throw erroFrequencia.invalido("Informe turma e disciplina."); return { filtros: { turmaDisciplinaId: id, dataInicio: f.dataInicio || null, dataFim: f.dataFim || null }, ...(await this.consultarTurma(id, req, f)) }; }

  private async autorizarTurma(ctx: any, id: string, secretariaPode = false) { if (ctx.perfil === "secretaria" && secretariaPode) return; if (ctx.perfil !== "professor" || !ctx.professorId || !(await this.repository.professorPossuiTurma(ctx.professorId, id))) throw erroFrequencia.proibido("Turma fora da atribuição do professor."); }
  private async validarPeriodo(id: string, data: string, escrita: boolean) { const t: any = await this.repository.buscarTurma(id); if (!t) throw erroFrequencia.naoEncontrado("Turma/disciplina não encontrada."); if (data > this.hojeLocal()) throw erroFrequencia.invalido("Não é permitido registrar data futura."); if (data < this.iso(t.data_inicio) || data > this.iso(t.data_fim)) throw erroFrequencia.invalido("Data fora do período letivo da turma."); if (escrita && (!t.periodo_ativo || !["ativo", "ATIVO", "em_andamento", "EM_ANDAMENTO"].includes(t.periodo_status))) throw erroFrequencia.conflito("O período letivo não está ativo para lançamentos."); return t; }
  private validarPayload(p: any) { if (!p || !Array.isArray(p.registros) || !p.registros.length) throw erroFrequencia.invalido("Informe a chamada completa."); this.uuid(p.turmaDisciplinaId, "Turma/disciplina inválida."); this.data(p.data); if (p.aulaId) this.uuid(p.aulaId, "Aula inválida."); if (p.localId) this.uuid(p.localId, "Local inválido."); p.registros.forEach((r: any) => { this.uuid(r.alunoId, "Aluno inválido."); this.status(r.status); }); }
  private filtros(f: any) { if (f.dataInicio) this.data(String(f.dataInicio)); if (f.dataFim) this.data(String(f.dataFim)); if (f.dataInicio && f.dataFim && f.dataInicio > f.dataFim) throw erroFrequencia.invalido("A data inicial deve ser anterior à final."); }
  private uuid(v: string, msg: string) { if (!UUID.test(v)) throw erroFrequencia.invalido(msg); }
  private data(v: string) { if (!DATA.test(v)) throw erroFrequencia.invalido("Data inválida. Use AAAA-MM-DD."); const [ano, mes, dia] = v.split("-").map(Number); const normalizada = new Date(Date.UTC(ano, mes - 1, dia)).toISOString().slice(0, 10); if (normalizada !== v) throw erroFrequencia.invalido("Data inválida. Use AAAA-MM-DD."); }
  private status(v: StatusFrequencia) { if (!["PRESENTE", "AUSENTE"].includes(v)) throw erroFrequencia.invalido("Status de frequência inválido. Use PRESENTE ou AUSENTE."); }
  private consolidar(g: any): ConsolidadoFrequencia { const contabilizadas = g.presencas + g.faltas; const percentual = contabilizadas ? Number((g.presencas / contabilizadas * 100).toFixed(2)) : null; return { ...g, percentual, situacao: percentual === null ? "NAO_LANCADO" : percentual < 75 ? "RISCO_REPROVACAO" : percentual <= 80 ? "ALERTA" : "REGULAR" }; }
  private iso(v: any) { return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10); }
  private hojeLocal() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
}

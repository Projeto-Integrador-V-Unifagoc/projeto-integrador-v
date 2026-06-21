import type { Request } from "express";
import { AuthContextGateway, type ContextoNota } from "../gateways/AuthContextGateway.js";
import { erroNota, NotaError } from "../errors/NotaError.js";
import { NotaRepository } from "../repository/NotaRepository.js";
import {
  calcularBoletim,
  type AutorizacaoExcepcionalRequest,
  type AvaliacaoResumo,
  type SalvarLoteNotaRequest,
} from "../models/Nota.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRAZO_RETIFICACAO_MS = 7 * 86400000;
const PERIODO_FECHADO = ["fechado", "encerrado", "concluido", "inativo"];

export class NotaService {
  constructor(
    private repository = new NotaRepository(),
    private auth = new AuthContextGateway(repository),
  ) {}

  // GET /notas/opcoes — atribuicoes e avaliacoes do professor/secretaria.
  async listarOpcoes(req: Request) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    const atribuicoes = await this.repository.listarAtribuicoes(ctx.professorId);
    const comAvaliacoes = await Promise.all(
      atribuicoes.map(async (a: any) => ({
        turmaDisciplinaId: a.id,
        turma: { id: a.turma_id, sigla: a.turma_sigla, descricao: a.turma_descricao },
        disciplina: { id: a.disciplina_id, codigo: a.disciplina_codigo, nome: a.disciplina_nome },
        periodoLetivo: { id: a.periodo_id, codigo: a.periodo_codigo, status: a.periodo_status, fechado: this.periodoFechado(a) },
        professorNome: a.professor_nome,
        avaliacoes: (await this.repository.listarAvaliacoesDaTurma(a.id)).map((av: any) => this.avaliacaoResumo(av)),
      })),
    );
    return { contexto: { perfil: ctx.perfil }, atribuicoes: comAvaliacoes };
  }

  // GET /notas/avaliacoes/:avaliacaoId/lancamento — grade de lancamento.
  async obterLancamento(avaliacaoId: string, req: Request) {
    this.uuid(avaliacaoId, "Avaliação inválida.");
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    const avaliacao: any = await this.repository.buscarAvaliacao(avaliacaoId);
    if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
    await this.autorizarTurma(ctx, avaliacao.turma_disciplina_id);

    const maximo = Number(avaliacao.valor);
    const fechado = this.periodoFechado(avaliacao);
    const podeEditar = !fechado && (ctx.perfil === "professor" || ctx.perfil === "secretaria");
    const [alunos, notas] = await Promise.all([
      this.repository.listarMatriculasAtivas(avaliacao.turma_disciplina_id),
      this.repository.listarNotasDaAvaliacao(avaliacaoId),
    ]);
    const porMatricula = new Map(notas.map((n: any) => [String(n.matricula_turma_disciplina_id), n]));
    const agora = Date.now();

    return {
      avaliacao: {
        id: avaliacao.id,
        tipo: avaliacao.tipo_avaliacao,
        descricao: avaliacao.descricao_avaliacao,
        valorMaximo: maximo,
        disciplina: { id: avaliacao.disciplina_id, nome: avaliacao.disciplina_nome },
        turmaSigla: avaliacao.turma_sigla,
      },
      periodoLetivo: { codigo: avaliacao.periodo_codigo, status: avaliacao.periodo_status, fechado },
      podeEditar,
      matriculasIrregulares: await this.repository.contarMatriculasIrregulares(avaliacao.turma_disciplina_id),
      alunos: alunos.map((a: any) => {
        const nota: any = porMatricula.get(String(a.matricula_turma_disciplina_id));
        const prazoExpirado = nota ? agora > new Date(nota.publicada_em).getTime() + PRAZO_RETIFICACAO_MS : false;
        return {
          alunoId: a.aluno_id,
          matriculaTurmaDisciplinaId: a.matricula_turma_disciplina_id,
          matricula: a.matricula,
          nome: a.aluno_nome,
          valor: nota ? Number(nota.valor) : null,
          lancada: Boolean(nota),
          publicadaEm: nota?.publicada_em ?? null,
          prazoExpirado,
        };
      }),
    };
  }

  // PUT /notas/avaliacoes/:avaliacaoId/lote — upsert atomico (secao 8).
  async salvarLote(avaliacaoId: string, payload: SalvarLoteNotaRequest, req: Request) {
    this.uuid(avaliacaoId, "Avaliação inválida.");
    if (!payload || !Array.isArray(payload.itens) || payload.itens.length === 0) {
      throw erroNota.invalido("Informe ao menos uma nota no lote.");
    }
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();

    const avaliacao: any = await this.repository.buscarAvaliacao(avaliacaoId);
    if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
    await this.autorizarTurma(ctx, avaliacao.turma_disciplina_id);
    if (this.periodoFechado(avaliacao)) throw erroNota.conflito("Período letivo fechado bloqueia alterações de nota.");

    const maximo = Number(avaliacao.valor);
    const [elegiveis, avaliacoesDaTurma] = await Promise.all([
      this.repository.listarMatriculasAtivas(avaliacao.turma_disciplina_id),
      this.repository.listarAvaliacoesDaTurma(avaliacao.turma_disciplina_id),
    ]);
    const resumosDaTurma = avaliacoesDaTurma.map((item: any) => this.avaliacaoResumo(item));
    const totalRegular = resumosDaTurma
      .filter((item) => item.tipo !== "RECUPERACAO")
      .reduce((soma, item) => soma + item.valor, 0);
    if (totalRegular > 100) {
      throw erroNota.invalido("As avaliações regulares da turma ultrapassam o limite de 100 pontos.");
    }

    let matriculasEmRecuperacao: Set<string> | null = null;
    if (avaliacao.tipo_avaliacao === "RECUPERACAO") {
      const notasDaTurma = await this.repository.listarNotasDaTurma(avaliacao.turma_disciplina_id);
      const notasPorMatricula = this.agruparNotas(notasDaTurma);
      matriculasEmRecuperacao = new Set(
        elegiveis
          .filter((matricula: any) => {
            const notas = notasPorMatricula.get(String(matricula.matricula_turma_disciplina_id)) ?? new Map<string, number>();
            return calcularBoletim(resumosDaTurma, notas).elegivelRecuperacao;
          })
          .map((matricula: any) => String(matricula.matricula_turma_disciplina_id)),
      );
    }
    const porAluno = new Map(elegiveis.map((a: any) => [String(a.aluno_id), a]));

    const vistos = new Set<string>();
    const erros: string[] = [];
    const itens: Array<{ matriculaId: string; valor: number }> = [];
    for (const item of payload.itens) {
      const alunoId = String(item?.alunoId || "");
      if (!UUID.test(alunoId)) { erros.push("Aluno inválido no lote."); continue; }
      if (vistos.has(alunoId)) { erros.push(`Aluno ${alunoId} duplicado no lote.`); continue; }
      vistos.add(alunoId);
      const elegivel: any = porAluno.get(alunoId);
      if (!elegivel) { erros.push(`Aluno ${alunoId} sem matrícula ativa nesta atribuição.`); continue; }
      if (matriculasEmRecuperacao && !matriculasEmRecuperacao.has(String(elegivel.matricula_turma_disciplina_id))) {
        erros.push(`Aluno ${alunoId} não está elegível para recuperação.`);
        continue;
      }
      const valor = Number(item.valor);
      if (!Number.isFinite(valor) || valor < 0 || valor > maximo) {
        erros.push(`Nota inválida para o aluno ${alunoId}: use um valor entre 0 e ${maximo}.`);
        continue;
      }
      itens.push({ matriculaId: elegivel.matricula_turma_disciplina_id, valor });
    }
    if (erros.length) throw erroNota.invalido(erros.join(" "));

    try {
      await this.repository.salvarLoteAtomico({
        avaliacaoId,
        usuarioId: ctx.usuarioId,
        perfil: ctx.perfil,
        itens,
      });
    } catch (e: any) {
      if (e instanceof NotaError) throw e;
      if (e?.code === "23505") throw erroNota.conflito("Conflito de concorrência ao salvar o lote. Tente novamente.");
      if (e?.codigoDominio === "PRAZO_EXPIRADO") throw erroNota.conflito(e.message);
      if (e?.codigoDominio === "VALOR_INVALIDO") throw erroNota.invalido(e.message);
      if (e?.codigoDominio === "NAO_ENCONTRADO") throw erroNota.naoEncontrado(e.message);
      throw e;
    }
    return { mensagem: "Notas salvas com sucesso.", ...(await this.obterLancamento(avaliacaoId, req)) };
  }

  // GET /notas/turmas/:turmaDisciplinaId/rendimento — mapa consolidado (RF-05).
  async obterRendimento(turmaDisciplinaId: string, req: Request) {
    this.uuid(turmaDisciplinaId, "Turma/disciplina inválida.");
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    await this.autorizarTurma(ctx, turmaDisciplinaId);

    const turma: any = await this.repository.buscarTurmaDisciplina(turmaDisciplinaId);
    if (!turma) throw erroNota.naoEncontrado("Turma/disciplina não encontrada.");
    const [avaliacoes, matriculas, notas] = await Promise.all([
      this.repository.listarAvaliacoesDaTurma(turmaDisciplinaId),
      this.repository.listarMatriculasAtivas(turmaDisciplinaId),
      this.repository.listarNotasDaTurma(turmaDisciplinaId),
    ]);
    const resumos = avaliacoes.map((a: any) => this.avaliacaoResumo(a));
    const notasPorMatricula = this.agruparNotas(notas);

    return {
      turmaDisciplinaId,
      disciplina: { id: turma.disciplina_id, codigo: turma.disciplina_codigo, nome: turma.disciplina_nome },
      turma: { id: turma.turma_id, sigla: turma.turma_sigla },
      periodoLetivo: { codigo: turma.periodo_codigo, status: turma.periodo_status, fechado: this.periodoFechado(turma) },
      avaliacoes: resumos,
      matriculasIrregulares: await this.repository.contarMatriculasIrregulares(turmaDisciplinaId),
      alunos: matriculas.map((m: any) => {
        const mapa = notasPorMatricula.get(String(m.matricula_turma_disciplina_id)) ?? new Map<string, number>();
        const boletim = calcularBoletim(resumos, mapa);
        return {
          alunoId: m.aluno_id,
          matriculaTurmaDisciplinaId: m.matricula_turma_disciplina_id,
          matricula: m.matricula,
          nome: m.aluno_nome,
          notas: resumos.map((a) => ({ avaliacaoId: a.id, valor: mapa.has(a.id) ? Number(mapa.get(a.id)) : null })),
          ...boletim,
        };
      }),
    };
  }

  // GET /notas/turmas/:turmaDisciplinaId/recuperacao — alunos elegiveis (RF-08, secao 9.4).
  async obterRecuperacao(turmaDisciplinaId: string, req: Request) {
    this.uuid(turmaDisciplinaId, "Turma/disciplina inválida.");
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    await this.autorizarTurma(ctx, turmaDisciplinaId);

    const turma: any = await this.repository.buscarTurmaDisciplina(turmaDisciplinaId);
    if (!turma) throw erroNota.naoEncontrado("Turma/disciplina não encontrada.");

    let recuperacao: any = await this.repository.buscarRecuperacaoDaTurma(turmaDisciplinaId);
    const [avaliacoes, matriculas, notas] = await Promise.all([
      this.repository.listarAvaliacoesDaTurma(turmaDisciplinaId),
      this.repository.listarMatriculasAtivas(turmaDisciplinaId),
      this.repository.listarNotasDaTurma(turmaDisciplinaId),
    ]);
    const resumos = avaliacoes.map((a: any) => this.avaliacaoResumo(a));
    const notasPorMatricula = this.agruparNotas(notas);

    const alunos = matriculas
      .map((m: any) => {
        const mapa = notasPorMatricula.get(String(m.matricula_turma_disciplina_id)) ?? new Map<string, number>();
        const boletim = calcularBoletim(resumos, mapa);
        return { alunoId: m.aluno_id, matriculaTurmaDisciplinaId: m.matricula_turma_disciplina_id, matricula: m.matricula, nome: m.aluno_nome, ...boletim };
      })
      .filter((a) => a.elegivelRecuperacao);

    // Consultar a tela nao deve criar recuperacao antes de a etapa regular
    // totalizar 100 pontos e existir ao menos um aluno elegivel.
    if (!recuperacao && alunos.length > 0 && !this.periodoFechado(turma)) {
      recuperacao = await this.repository.criarRecuperacao(turmaDisciplinaId);
    }

    return {
      turmaDisciplinaId,
      disciplina: { id: turma.disciplina_id, nome: turma.disciplina_nome },
      recuperacaoAvaliacaoId: recuperacao?.id ?? null,
      periodoLetivo: { codigo: turma.periodo_codigo, fechado: this.periodoFechado(turma) },
      alunos,
    };
  }

  // POST /notas/autorizacoes-excepcionais — somente secretaria (RN-13, secao 5.7).
  async criarAutorizacaoExcepcional(payload: AutorizacaoExcepcionalRequest, req: Request) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil !== "secretaria") throw erroNota.proibido("Apenas a secretaria autoriza exceções de prazo.");
    this.uuid(String(payload?.avaliacaoId || ""), "Avaliação inválida.");
    const motivo = String(payload?.motivo || "").trim();
    if (motivo.length < 5 || motivo.length > 500) throw erroNota.invalido("Informe um motivo entre 5 e 500 caracteres.");
    if (payload.matriculaTurmaDisciplinaId) this.uuid(payload.matriculaTurmaDisciplinaId, "Matrícula inválida.");

    const avaliacao: any = await this.repository.buscarAvaliacao(payload.avaliacaoId);
    if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
    if (this.periodoFechado(avaliacao)) {
      throw erroNota.conflito("Período fechado. Reabra o período letivo antes de autorizar a retificação.");
    }
    const prazo = Number(payload.prazoEmDias);
    const dias = Number.isFinite(prazo) && prazo > 0 && prazo <= 60 ? prazo : 7;
    const autorizacao = await this.repository.criarAutorizacaoExcepcional({
      avaliacaoId: payload.avaliacaoId,
      matriculaTurmaDisciplinaId: payload.matriculaTurmaDisciplinaId,
      motivo,
      usuarioId: ctx.usuarioId,
      expiraEm: new Date(Date.now() + dias * 86400000),
    });
    return { mensagem: "Autorização excepcional registrada e auditada.", autorizacao };
  }

  // GET /notas/me — boletim do proprio aluno (UC-02, RF-04).
  async meuBoletim(req: Request, periodoId?: string) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil !== "aluno" || !ctx.alunoId) throw erroNota.proibido();
    return this.montarBoletimAluno(ctx.alunoId, periodoId);
  }

  // GET /notas/me/resumo — resumo para a Home (RF-06, secao 5.6).
  async meuResumo(req: Request) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil !== "aluno" || !ctx.alunoId) throw erroNota.proibido();
    const boletim = await this.montarBoletimAluno(ctx.alunoId);
    const abaixoDe60 = boletim.disciplinas.filter((d) => d.mediaParcial !== null && d.mediaParcial < 60);
    return {
      totalDisciplinas: boletim.disciplinas.length,
      disciplinasAbaixoDe60: abaixoDe60.length,
      possuiAlerta: abaixoDe60.length > 0,
      disciplinasAlerta: abaixoDe60.map((d) => ({ disciplinaNome: d.disciplinaNome, mediaParcial: d.mediaParcial })),
    };
  }

  // GET /notas/alunos/:alunoId — consulta administrativa (secao 7).
  async consultarAluno(alunoId: string, req: Request) {
    this.uuid(alunoId, "Aluno inválido.");
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") {
      if (ctx.alunoId !== alunoId) throw erroNota.proibido();
    } else if (ctx.perfil === "professor") {
      if (!ctx.professorId || !(await this.repository.professorPossuiAluno(ctx.professorId, alunoId))) {
        throw erroNota.proibido("Aluno fora das atribuições do professor.");
      }
    }
    return this.montarBoletimAluno(alunoId);
  }

  // ----- internos -----

  private async montarBoletimAluno(alunoId: string, periodoId?: string) {
    const [turmas, rows] = await Promise.all([
      this.repository.listarTurmasDoAluno(alunoId, periodoId),
      this.repository.listarBoletimDoAluno(alunoId),
    ]);
    const avaliacoesPorTurma = new Map<string, Map<string, any>>();
    const notasPorTurma = new Map<string, Map<string, number>>();
    for (const r of rows as any[]) {
      const td = String(r.turma_disciplina_id);
      if (!avaliacoesPorTurma.has(td)) avaliacoesPorTurma.set(td, new Map());
      avaliacoesPorTurma.get(td)!.set(String(r.avaliacao_id), {
        id: r.avaliacao_id,
        tipo_avaliacao: r.tipo_avaliacao,
        descricao_avaliacao: r.descricao_avaliacao,
        valor: r.valor,
      });
      if (r.nota_valor !== null && r.nota_valor !== undefined) {
        if (!notasPorTurma.has(td)) notasPorTurma.set(td, new Map());
        notasPorTurma.get(td)!.set(String(r.avaliacao_id), Number(r.nota_valor));
      }
    }

    const disciplinas = (turmas as any[]).map((t) => {
      const td = String(t.turma_disciplina_id);
      const avaliacoes = [...(avaliacoesPorTurma.get(td)?.values() ?? [])].map((a: any) => this.avaliacaoResumo(a));
      const mapaNotas = notasPorTurma.get(td) ?? new Map<string, number>();
      const boletim = calcularBoletim(avaliacoes, mapaNotas);
      return {
        turmaDisciplinaId: td,
        disciplina: { id: t.disciplina_id, codigo: t.disciplina_codigo, nome: t.disciplina_nome },
        disciplinaNome: t.disciplina_nome,
        turmaSigla: t.turma_sigla,
        professorNome: t.professor_nome,
        periodoLetivo: { id: t.periodo_id, codigo: t.periodo_codigo },
        avaliacoes: avaliacoes.map((a) => ({
          id: a.id,
          tipo: a.tipo,
          descricao: a.descricao,
          valorMaximo: a.valor,
          valorObtido: mapaNotas.has(a.id) ? Number(mapaNotas.get(a.id)) : null,
          lancada: mapaNotas.has(a.id),
        })),
        ...boletim,
      };
    });

    return { alunoId, possuiAlerta: disciplinas.some((d) => d.alerta), disciplinas };
  }

  private agruparNotas(notas: any[]) {
    const mapa = new Map<string, Map<string, number>>();
    for (const n of notas) {
      const mtd = String(n.matricula_turma_disciplina_id);
      if (!mapa.has(mtd)) mapa.set(mtd, new Map());
      mapa.get(mtd)!.set(String(n.avaliacao_id), Number(n.valor));
    }
    return mapa;
  }

  private avaliacaoResumo(a: any): AvaliacaoResumo {
    return { id: a.id, tipo: a.tipo_avaliacao, descricao: a.descricao_avaliacao ?? null, valor: Number(a.valor) };
  }

  private async autorizarTurma(ctx: ContextoNota, turmaDisciplinaId: string) {
    if (ctx.perfil === "secretaria") return;
    if (ctx.perfil === "professor" && ctx.professorId && (await this.repository.professorPossuiTurma(ctx.professorId, turmaDisciplinaId))) return;
    throw erroNota.proibido("Turma/disciplina fora das atribuições do professor.");
  }

  private periodoFechado(registro: any) {
    const status = String(registro?.periodo_status || "").toLowerCase();
    return registro?.periodo_ativo === false || PERIODO_FECHADO.includes(status);
  }

  private uuid(valor: string, mensagem: string) {
    if (!UUID.test(valor)) throw erroNota.invalido(mensagem);
  }
}

import type { Request } from "express";
import { AuthContextGateway, type ContextoNota } from "../gateways/AuthContextGateway.js";
import { erroNota, NotaError, type CampoErroNota } from "../errors/NotaError.js";
import { NotaRepository } from "../repository/NotaRepository.js";
import {
  projetarBoletim,
  type AutorizacaoExcepcionalRequest,
  type AvaliacaoResumoPontos,
  type SalvarLoteNotaRequest,
} from "../models/Nota.js";
import { ErroPontos, formatarPontos, parsePontos } from "../../avaliacao/models/Pontos";
import { ConflitoAcademico, type ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { criarResultadoAcademicoService } from "./criarResultadoAcademicoService";
import type { ResultadoAcademicoService } from "./ResultadoAcademicoService";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidValido = (valor: unknown): valor is string => typeof valor === "string" && valor.length === 36 && UUID.test(valor);
const PRAZO_RETIFICACAO_MS = 7 * 86400000;
const PERIODO_FECHADO = ["fechado", "encerrado", "concluido", "inativo"];

export class NotaService {
  constructor(
    private repository = new NotaRepository(),
    private auth = new AuthContextGateway(repository),
    private resultado: ResultadoAcademicoService = criarResultadoAcademicoService(repository),
  ) {}

  // GET /notas/opcoes — atribuicoes e avaliacoes do professor/secretaria.
  async listarOpcoes(req: Request) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    const consulta = await this.resultado.consultar({ somenteOfertasAtivas: true }, req);
    const comAvaliacoes = consulta.ofertas.map((a) => ({
        turmaDisciplinaId: a.id,
        turma: { id: a.turma_id, sigla: a.turma_sigla, descricao: a.turma_descricao },
        disciplina: { id: a.disciplina_id, codigo: a.disciplina_codigo, nome: a.disciplina_nome },
        periodoLetivo: { id: a.periodo_id, codigo: a.periodo_codigo, status: a.periodo_status, fechado: this.periodoFechado(a) },
        professorNome: a.professor_nome,
        plano: a.plano,
        avaliacoes: a.avaliacoes.map((av) => ({ id: av.id, tipo: av.tipo, descricao: av.descricao, valor: av.valor })),
      }));
    return { contexto: { perfil: ctx.perfil }, atribuicoes: comAvaliacoes };
  }

  // GET /notas/avaliacoes/:avaliacaoId/lancamento — grade de lancamento.
  async obterLancamento(avaliacaoId: string, req: Request, executor?: ExecutorAcademico) {
    this.uuid(avaliacaoId, "Avaliação inválida.");
    const ctx = await this.auth.obterContexto(req, executor);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    const avaliacao: any = await this.repository.buscarAvaliacao(avaliacaoId, executor);
    if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
    await this.autorizarTurma(ctx, avaliacao.turma_disciplina_id, executor);

    if (avaliacao.tipo_avaliacao === "RECUPERACAO" && !executor) {
      return this.repository.snapshot((trx) => this.obterLancamento(avaliacaoId, req, trx));
    }
    const resultadosRecuperacao = avaliacao.tipo_avaliacao === "RECUPERACAO"
      ? await this.resultado.compor({ ofertaIds: [avaliacao.turma_disciplina_id] }, ctx, executor!) : null;
    const porResultado = new Map(resultadosRecuperacao?.matriculas.map((m) =>
      [m.matricula_turma_disciplina_id, m.resultadoAcademico]));

    const maximo = this.pontosPersistidos(avaliacao.valor);
    const fechado = this.periodoFechado(avaliacao);
    const podeEditar = !fechado;
    const alunos = await this.repository.listarMatriculasAtivas(avaliacao.turma_disciplina_id, executor);
    const notas = await this.repository.listarNotasDaAvaliacao(avaliacaoId, executor);
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
      matriculasIrregulares: await this.repository.contarMatriculasIrregulares(avaliacao.turma_disciplina_id, executor),
      alunos: alunos.filter((a: any) => !resultadosRecuperacao ||
        porResultado.get(String(a.matricula_turma_disciplina_id))?.elegivelRecuperacaoPorNota).map((a: any) => {
        const nota: any = porMatricula.get(String(a.matricula_turma_disciplina_id));
        const prazoExpirado = nota ? agora > new Date(nota.publicada_em).getTime() + PRAZO_RETIFICACAO_MS : false;
        return {
          alunoId: a.aluno_id,
          matriculaTurmaDisciplinaId: a.matricula_turma_disciplina_id,
          matricula: a.matricula,
          nome: a.aluno_nome,
          valor: nota ? this.pontosPersistidos(nota.valor) : null,
          lancada: Boolean(nota),
          publicadaEm: nota?.publicada_em ?? null,
          prazoExpirado,
          ...(resultadosRecuperacao ? { resultadoAcademico: porResultado.get(String(a.matricula_turma_disciplina_id)) } : {}),
        };
      }),
    };
  }

  // PUT /notas/avaliacoes/:avaliacaoId/lote — upsert atomico (secao 8).
  async salvarLote(avaliacaoId: string, payload: SalvarLoteNotaRequest, req: Request) {
    this.uuid(avaliacaoId, "Avaliação inválida.");
    avaliacaoId = avaliacaoId.toLowerCase();
    if (!payload || !Array.isArray(payload.itens) || payload.itens.length === 0) {
      throw erroNota.invalido("Informe ao menos uma nota no lote.");
    }
    const inicial = await this.auth.obterContexto(req);
    if (inicial.perfil === "aluno") throw erroNota.proibido();
    const alunos = [...new Set(payload.itens.flatMap((item) =>
      uuidValido(item?.alunoId) ? [item.alunoId.toLowerCase()] : []))];
    try {
      return await this.repository.transacaoParaNotas(avaliacaoId, alunos, async (trx) => {
        const ctx = await this.auth.obterContexto(req, trx);
        if (ctx.perfil === "aluno") throw erroNota.proibido();
        const avaliacao: any = await this.repository.buscarAvaliacao(avaliacaoId, trx);
        if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
        await this.autorizarTurma(ctx, avaliacao.turma_disciplina_id, trx);
        if (this.periodoFechado(avaliacao)) {
          throw erroNota.conflito("Período letivo fechado bloqueia alterações de nota.", "PERIODO_FECHADO");
        }
        const maximo = parsePontos(String(avaliacao.valor));
        const elegiveis = await this.repository.listarMatriculasAtivas(avaliacao.turma_disciplina_id, trx);
        const porAluno = new Map(elegiveis.map((a: any) => [String(a.aluno_id).toLowerCase(), a]));

        let recuperacao: Set<string> | null = null;
        if (avaliacao.tipo_avaliacao === "RECUPERACAO") {
          const consulta = await this.resultado.compor({ ofertaIds: [avaliacao.turma_disciplina_id] }, ctx, trx);
          const plano = consulta.ofertas[0]?.plano;
          if (!plano?.totalPontos || parsePontos(plano.totalPontos) !== maximo || avaliacao.subgrupo_id != null) {
            throw erroNota.conflito("A recuperação não corresponde ao plano vigente.", "RECUPERACAO_NAO_ELEGIVEL");
          }
          recuperacao = new Set(consulta.matriculas.filter((m) => m.resultadoAcademico.elegivelRecuperacaoPorNota)
            .map((m) => m.matricula_turma_disciplina_id));
        }
        const vistos = new Set<string>();
        const campos: CampoErroNota[] = [];
        const itens: Array<{ matriculaId: string; valor: string }> = [];
        for (const [indice, item] of payload.itens.entries()) {
          const campoAluno = `itens[${indice}].alunoId`;
          const campoValor = `itens[${indice}].valor`;
          if (!uuidValido(item?.alunoId)) {
            campos.push({ campo: campoAluno, codigo: "LOTE_INVALIDO", mensagem: "Informe um aluno válido no lote." }); continue;
          }
          const alunoId = item.alunoId.toLowerCase();
          if (vistos.has(alunoId)) {
            campos.push({ campo: campoAluno, codigo: "LOTE_INVALIDO", mensagem: "Aluno duplicado no lote." }); continue;
          }
          vistos.add(alunoId);
          const matricula: any = porAluno.get(alunoId);
          if (!matricula) {
            campos.push({ campo: campoAluno, codigo: "LOTE_INVALIDO", mensagem: "Item sem matrícula ativa nesta oferta." }); continue;
          }
          if (recuperacao && !recuperacao.has(String(matricula.matricula_turma_disciplina_id))) {
            throw erroNota.conflito("O aluno não está elegível para recuperação.", "RECUPERACAO_NAO_ELEGIVEL");
          }
          try {
            const valor = parsePontos(item.valor, { campo: campoValor });
            if (valor > maximo) {
              campos.push({ campo: campoValor, codigo: "VALOR_INVALIDO", mensagem: "A nota excede o máximo desta avaliação." }); continue;
            }
            itens.push({ matriculaId: String(matricula.matricula_turma_disciplina_id), valor: formatarPontos(valor) });
          } catch (erro) {
            if (!(erro instanceof ErroPontos)) throw erro;
            campos.push({ campo: campoValor, codigo: erro.codigo, mensagem: erro.message });
          }
        }
        if (campos.length) {
          const codigo = campos.every((c) => c.codigo === campos[0].codigo) ? campos[0].codigo : "LOTE_INVALIDO";
          throw erroNota.invalido(campos[0].mensagem, codigo, campos);
        }
        let motivo: string | undefined;
        if (payload.motivo !== undefined) {
          if (typeof payload.motivo !== "string" || payload.motivo.trim().length === 0 || payload.motivo.trim().length > 500) {
            throw erroNota.invalido("Informe um motivo válido com até 500 caracteres.", "LOTE_INVALIDO",
              [{ campo: "motivo", codigo: "LOTE_INVALIDO", mensagem: "Informe um motivo válido com até 500 caracteres." }]);
          }
          motivo = payload.motivo.trim();
        }
        await this.repository.salvarLoteAtomico({ avaliacaoId, usuarioId: ctx.usuarioId, perfil: ctx.perfil, itens, motivo }, trx);
        return { mensagem: "Notas salvas com sucesso.", ...(await this.obterLancamento(avaliacaoId, req, trx)) };
      });
    } catch (erro: any) {
      if (erro instanceof NotaError) throw erro;
      if (erro instanceof ConflitoAcademico || erro?.code === "23505") {
        throw erroNota.conflito("Conflito de concorrência ao salvar o lote. Recarregue e tente novamente.");
      }
      if (erro?.codigoDominio === "PRAZO_EXPIRADO") throw erroNota.conflito("Prazo de retificação expirado. Necessária autorização da secretaria.", "PRAZO_EXPIRADO");
      if (erro?.codigoDominio === "VALOR_INVALIDO") throw erroNota.invalido("A nota excede o máximo desta avaliação.", "VALOR_INVALIDO");
      if (erro?.codigoDominio === "NAO_ENCONTRADO" || erro?.code === "23503") throw erroNota.naoEncontrado("Um registro necessário não está disponível.");
      if (erro?.code === "23514") {
        if (/PERIODO_ENCERRADO/.test(erro.message)) throw erroNota.conflito("Período letivo fechado bloqueia alterações de nota.", "PERIODO_FECHADO");
        if (/ETAPA_REGULAR_INCOMPLETA|RECUPERACAO_INELEGIVEL/.test(erro.message)) throw erroNota.conflito("A etapa regular não permite esta recuperação.", "RECUPERACAO_NAO_ELEGIVEL");
        if (/NOTA_ACIMA_MAXIMO/.test(erro.message)) throw erroNota.invalido("A nota excede o máximo desta avaliação.", "VALOR_INVALIDO");
        if (/NOTA_MATRICULA_INCOMPATIVEL/.test(erro.message)) throw erroNota.invalido("O lote contém matrícula incompatível.");
        throw erroNota.conflito("Os registros não permitem esta alteração. Recarregue e tente novamente.");
      }
      throw erro;
    }
  }
  // GET /notas/turmas/:turmaDisciplinaId/rendimento — mapa consolidado (RF-05).
  async obterRendimento(turmaDisciplinaId: string, req: Request) {
    this.uuid(turmaDisciplinaId, "Turma/disciplina inválida.");
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    const consulta = await this.resultado.consultar({ ofertaIds: [turmaDisciplinaId] }, req);
    const turma = consulta.ofertas[0];
    if (!turma) throw erroNota.naoEncontrado("Turma/disciplina não encontrada.");
    const resumos = turma.avaliacoes.map((a) => ({ id: a.id, tipo: a.tipo, descricao: a.descricao, valor: a.valor }));

    return {
      turmaDisciplinaId,
      disciplina: { id: turma.disciplina_id, codigo: turma.disciplina_codigo, nome: turma.disciplina_nome },
      turma: { id: turma.turma_id, sigla: turma.turma_sigla },
      periodoLetivo: { codigo: turma.periodo_codigo, status: turma.periodo_status, fechado: this.periodoFechado(turma) },
      avaliacoes: resumos,
      matriculasIrregulares: Number(turma.matriculas_irregulares ?? 0),
      plano: turma.plano,
      alunos: consulta.matriculas.map((m) => {
        return {
          alunoId: m.aluno_id,
          matriculaTurmaDisciplinaId: m.matricula_turma_disciplina_id,
          matricula: m.matricula,
          nome: m.aluno_nome,
          notas: resumos.map((a) => ({ avaliacaoId: a.id, valor: m.notas.get(a.id) ?? null })),
          ...projetarBoletim(m.resultadoAcademico),
        };
      }),
    };
  }

  // GET /notas/turmas/:turmaDisciplinaId/recuperacao — alunos elegiveis (RF-08, secao 9.4).
  async obterRecuperacao(turmaDisciplinaId: string, req: Request) {
    this.uuid(turmaDisciplinaId, "Turma/disciplina inválida.");
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") throw erroNota.proibido();
    return this.repository.transacaoParaRecuperacao(turmaDisciplinaId, async (trx) => {
      const contexto = await this.auth.obterContexto(req, trx);
      if (contexto.perfil === "aluno") throw erroNota.proibido();
      let consulta = await this.resultado.compor({ ofertaIds: [turmaDisciplinaId] }, contexto, trx);
      const turma = consulta.ofertas[0];
      if (!turma) throw erroNota.naoEncontrado("Turma/disciplina não encontrada.");
      const elegiveis = consulta.matriculas.filter((m) => m.resultadoAcademico.elegivelRecuperacaoPorNota);
      let recuperacao = turma.avaliacoes.find((a) => a.tipo === "RECUPERACAO");
      if (!recuperacao && elegiveis.length > 0 && !this.periodoFechado(turma) && turma.plano.totalPontos) {
        await this.repository.criarRecuperacao(turmaDisciplinaId, turma.plano.totalPontos, trx);
        // Recompõe pelo mesmo executor; a avaliação recém-criada também participa da resposta.
        consulta = await this.resultado.compor({ ofertaIds: [turmaDisciplinaId] }, contexto, trx);
        recuperacao = consulta.ofertas[0].avaliacoes.find((a) => a.tipo === "RECUPERACAO");
      }
      return { turmaDisciplinaId, disciplina: { id: turma.disciplina_id, nome: turma.disciplina_nome },
        recuperacaoAvaliacaoId: recuperacao?.id ?? null, valorMaximoRecuperacao: turma.plano.totalPontos,
        periodoLetivo: { codigo: turma.periodo_codigo, fechado: this.periodoFechado(turma) },
        alunos: consulta.matriculas.filter((m) => m.resultadoAcademico.elegivelRecuperacaoPorNota).map((m) => ({
          alunoId: m.aluno_id, matriculaTurmaDisciplinaId: m.matricula_turma_disciplina_id,
          matricula: m.matricula, nome: m.aluno_nome, ...projetarBoletim(m.resultadoAcademico),
        })) };
    });
  }

  // POST /notas/autorizacoes-excepcionais — somente secretaria (RN-13, secao 5.7).
  async criarAutorizacaoExcepcional(payload: AutorizacaoExcepcionalRequest, req: Request) {
    const inicial = await this.auth.obterContexto(req);
    if (!["secretaria", "administrador"].includes(inicial.perfil)) throw erroNota.proibido("Apenas o perfil administrativo autoriza exceções de prazo.");
    this.uuid(payload?.avaliacaoId ?? "", "Avaliação inválida.");
    const mensagemMotivo = "Informe um motivo textual entre 5 e 500 caracteres.";
    if (typeof payload?.motivo !== "string") {
      throw erroNota.invalido(mensagemMotivo, "LOTE_INVALIDO",
        [{ campo: "motivo", codigo: "LOTE_INVALIDO", mensagem: mensagemMotivo }]);
    }
    const motivo = payload.motivo.trim();
    if (motivo.length < 5 || motivo.length > 500) {
      throw erroNota.invalido(mensagemMotivo, "LOTE_INVALIDO",
        [{ campo: "motivo", codigo: "LOTE_INVALIDO", mensagem: mensagemMotivo }]);
    }
    if (payload.matriculaTurmaDisciplinaId !== undefined) this.uuid(payload.matriculaTurmaDisciplinaId, "Matrícula inválida.");
    const id = payload.avaliacaoId.toLowerCase();
    const matriculaId = payload.matriculaTurmaDisciplinaId?.toLowerCase();
    const prazo = Number(payload.prazoEmDias);
    const dias = Number.isFinite(prazo) && prazo > 0 && prazo <= 60 ? prazo : 7;
    return this.repository.transacaoParaAutorizacao(id, matriculaId, async (trx) => {
      const ctx = await this.auth.obterContexto(req, trx);
      if (!["secretaria", "administrador"].includes(ctx.perfil)) throw erroNota.proibido();
      const avaliacao: any = await this.repository.buscarAvaliacao(id, trx);
      if (!avaliacao) throw erroNota.naoEncontrado("Avaliação não encontrada.");
      if (this.periodoFechado(avaliacao)) {
        throw erroNota.conflito("Período fechado bloqueia autorização de retificação.", "PERIODO_FECHADO");
      }
      if (matriculaId) {
        const vinculo = await this.repository.buscarVinculoPorId(matriculaId, trx);
        if (!vinculo) throw erroNota.naoEncontrado("Matrícula não encontrada.");
        if (String(vinculo.turma_disciplina_id) !== String(avaliacao.turma_disciplina_id)) {
          throw erroNota.invalido("A matrícula informada não pertence à avaliação.", "LOTE_INVALIDO",
            [{ campo: "matriculaTurmaDisciplinaId", codigo: "LOTE_INVALIDO", mensagem: "Informe uma matrícula da oferta desta avaliação." }]);
        }
      }
      const autorizacao = await this.repository.criarAutorizacaoExcepcional({ avaliacaoId: id,
        matriculaTurmaDisciplinaId: matriculaId, motivo, usuarioId: ctx.usuarioId,
        expiraEm: new Date(Date.now() + dias * 86400000) }, trx);
      return { mensagem: "Autorização excepcional registrada e auditada.", autorizacao };
    });
  }
  // GET /notas/me — boletim do proprio aluno (UC-02, RF-04).
  async meuBoletim(req: Request, periodoId?: string) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil !== "aluno" || !ctx.alunoId) throw erroNota.proibido();
    return this.montarBoletimAluno(ctx.alunoId, req, periodoId);
  }

  // GET /notas/me/resumo — resumo para a Home (RF-06, secao 5.6).
  async meuResumo(req: Request) {
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil !== "aluno" || !ctx.alunoId) throw erroNota.proibido();
    const boletim = await this.montarBoletimAluno(ctx.alunoId, req);
    const abaixoDoCorte = boletim.disciplinas.filter((d) => d.resultadoAcademico.motivos.includes("ABAIXO_DO_CORTE"));
    const alertas = boletim.disciplinas.filter((d) => d.alerta);
    return {
      totalDisciplinas: boletim.disciplinas.length,
      disciplinasAbaixoDoCorte: abaixoDoCorte.length,
      disciplinasAbaixoDe60: abaixoDoCorte.length,
      possuiAlerta: alertas.length > 0,
      disciplinasAlerta: alertas.map((d) => ({ turmaDisciplinaId: d.turmaDisciplinaId,
        matriculaTurmaDisciplinaId: d.matriculaTurmaDisciplinaId, disciplinaNome: d.disciplinaNome,
        mediaParcial: d.mediaParcial, resultadoAcademico: d.resultadoAcademico })),
    };
  }

  // GET /notas/alunos/:alunoId — consulta administrativa (secao 7).
  async consultarAluno(alunoId: string, req: Request) {
    this.uuid(alunoId, "Aluno inválido.");
    alunoId = alunoId.toLowerCase();
    const ctx = await this.auth.obterContexto(req);
    if (ctx.perfil === "aluno") {
      if (ctx.alunoId !== alunoId) throw erroNota.proibido();
    }
    return this.montarBoletimAluno(alunoId, req);
  }

  // ----- internos -----

  private async montarBoletimAluno(alunoId: string, req: Request, periodoId?: string) {
    const consulta = await this.resultado.consultar({ alunoId, periodoLetivoId: periodoId }, req);
    const porOferta = new Map(consulta.ofertas.map((o) => [o.id, o]));
    const disciplinas = consulta.matriculas.map((m) => {
      const t = porOferta.get(m.turma_disciplina_id)!;
      return {
        turmaDisciplinaId: t.id,
        matriculaTurmaDisciplinaId: m.matricula_turma_disciplina_id,
        disciplina: { id: t.disciplina_id, codigo: t.disciplina_codigo, nome: t.disciplina_nome },
        disciplinaNome: t.disciplina_nome,
        turmaSigla: t.turma_sigla,
        professorNome: t.professor_nome,
        periodoLetivo: { id: t.periodo_id, codigo: t.periodo_codigo },
        plano: t.plano,
        avaliacoes: t.avaliacoes.map((a) => ({
          id: a.id,
          tipo: a.tipo,
          descricao: a.descricao,
          valorMaximo: a.valor,
          valorObtido: m.notas.get(a.id) ?? null,
          lancada: m.notas.has(a.id),
        })),
        ...projetarBoletim(m.resultadoAcademico),
      };
    });

    return { alunoId, possuiAlerta: disciplinas.some((d) => d.alerta), disciplinas };
  }

  private pontosPersistidos(valor: string | number): string {
    return formatarPontos(parsePontos(String(valor)));
  }

  private avaliacaoResumoPontos(a: any): AvaliacaoResumoPontos {
    return { id: a.id, tipo: a.tipo_avaliacao, descricao: a.descricao_avaliacao ?? null, valor: this.pontosPersistidos(a.valor) };
  }

  private async autorizarTurma(ctx: ContextoNota, turmaDisciplinaId: string, executor?: ExecutorAcademico) {
    if (ctx.perfil === "secretaria" || ctx.perfil === "administrador") return;
    if (ctx.perfil === "professor" && ctx.professorId && (await this.repository.professorPossuiTurma(ctx.professorId, turmaDisciplinaId, executor))) return;
    throw erroNota.proibido("Turma/disciplina fora das atribuições do professor.", "ESCOPO_PROIBIDO");
  }

  private periodoFechado(registro: any) {
    const status = String(registro?.periodo_status || "").toLowerCase();
    return registro?.periodo_ativo === false || PERIODO_FECHADO.includes(status);
  }

  private uuid(valor: string, mensagem: string) {
    if (!uuidValido(valor)) throw erroNota.invalido(mensagem, "UUID_INVALIDO");
  }
}

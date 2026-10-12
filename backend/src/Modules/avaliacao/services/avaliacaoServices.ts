import type { Knex } from "knex";
import { avaliacaoRepository } from "../repository/avaliacaoRepository.js";
import type { AtualizarAvaliacaoDTO, Avaliacao, ContextoAvaliacao, CriarAvaliacaoDTO, TipoAvaliacao } from "../models/avaliacaoModels.js";
import type { OfertaPontuacao } from "../gateways/RegraPontuacaoAuthGateway";
import type { RegraPontuacao } from "../models/RegraPontuacao";
import { formatarPontos, parsePontos, somarPontos } from "../models/Pontos";
import { AvaliacaoConflictError, AvaliacaoForbiddenError, AvaliacaoNotFoundError, AvaliacaoValidationError } from "../errors/avaliacaoErrors.js";

type Executor = Knex | Knex.Transaction;
type Dados = Record<string, unknown>;
type Oferta = OfertaPontuacao & { matriz_curso_id?: string };
type CadastroRegular = CriarAvaliacaoDTO & { tipo_avaliacao: "REGULAR"; subgrupo_id: string };
const TIPOS: TipoAvaliacao[] = ["REGULAR", "PROVA", "TPI", "TRABALHO", "RECUPERACAO"];
const CAMPOS = ["tipo_avaliacao", "subgrupo_id", "turma_disciplina_id", "descricao_avaliacao", "data_lancamento", "data_devolucao", "valor"] as const;
const ESTRUTURAIS = ["tipo_avaliacao", "subgrupo_id", "turma_disciplina_id", "valor"] as const;

function exigirPerfil(contexto: ContextoAvaliacao) {
  if (!["secretaria", "administrador", "professor"].includes(contexto.tipoUsuario)) {
    throw new AvaliacaoForbiddenError("Seu perfil não permite esta operação.", "PERFIL_PROIBIDO");
  }
}

function uuid(valor: unknown, campo: string): string {
  const padrao = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof valor !== "string" || padrao.exec(valor)?.[0] !== valor) {
    throw new AvaliacaoValidationError("Identificador inválido.", "UUID_INVALIDO", campo);
  }
  return valor.toLowerCase();
}

function objeto(valor: unknown): Dados {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new AvaliacaoValidationError("Envie os campos da avaliação.");
  return valor as Dados;
}

function data(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.length !== 10 || valor.startsWith("0000")) {
    throw new AvaliacaoValidationError("Informe uma data válida em AAAA-MM-DD.", "DATA_INVALIDA", campo);
  }
  const instante = new Date(`${valor}T00:00:00.000Z`);
  if (!Number.isFinite(instante.getTime()) || instante.toISOString().slice(0, 10) !== valor) {
    throw new AvaliacaoValidationError("Informe uma data válida no calendário.", "DATA_INVALIDA", campo);
  }
  return valor;
}

function descricao(valor: unknown): string | null {
  if (valor === undefined) return "";
  if (valor === null) return null;
  if (typeof valor !== "string") throw new AvaliacaoValidationError("A descrição deve ser textual.", "VALOR_INVALIDO", "descricao_avaliacao");
  return valor.trim();
}

function validarDatas(lancamento: string, devolucao: string | null) {
  if (devolucao && devolucao < lancamento) {
    throw new AvaliacaoValidationError("A devolução não pode ser anterior ao lançamento.", "DATA_INVALIDA", "data_devolucao");
  }
}

function dataArmazenada(valor: string | Date): string {
  return (valor instanceof Date ? valor.toISOString() : valor).slice(0, 10);
}

function normalizarCadastro(dados: Dados): CadastroRegular {
  if (dados.tipo_avaliacao !== undefined && dados.tipo_avaliacao !== "REGULAR") {
    throw new AvaliacaoValidationError("Use REGULAR no cadastro de avaliações.", "TIPO_INVALIDO", "tipo_avaliacao");
  }
  const lancamento = data(dados.data_lancamento, "data_lancamento");
  const devolucao = dados.data_devolucao === undefined || dados.data_devolucao === null ? null : data(dados.data_devolucao, "data_devolucao");
  validarDatas(lancamento, devolucao);
  return {
    tipo_avaliacao: "REGULAR", subgrupo_id: uuid(dados.subgrupo_id, "subgrupo_id"),
    turma_disciplina_id: uuid(dados.turma_disciplina_id, "turma_disciplina_id"),
    valor: formatarPontos(parsePontos(dados.valor, { positivo: true, campo: "valor" })),
    descricao_avaliacao: descricao(dados.descricao_avaliacao) ?? "",
    data_lancamento: lancamento, data_devolucao: devolucao,
  };
}

function normalizarPatch(dados: Dados): AtualizarAvaliacaoDTO {
  const patch: AtualizarAvaliacaoDTO = {};
  for (const campo of CAMPOS) {
    if (!Object.hasOwn(dados, campo)) continue;
    const valor = dados[campo];
    if (campo === "valor") patch.valor = formatarPontos(parsePontos(valor, { positivo: true, campo }));
    else if (campo === "subgrupo_id") patch.subgrupo_id = valor === null ? null : uuid(valor, campo);
    else if (campo === "turma_disciplina_id") patch.turma_disciplina_id = uuid(valor, campo);
    else if (campo === "data_lancamento") patch.data_lancamento = data(valor, campo);
    else if (campo === "data_devolucao") patch.data_devolucao = valor === null ? null : data(valor, campo);
    else if (campo === "descricao_avaliacao") patch.descricao_avaliacao = descricao(valor);
    else {
      if (typeof valor !== "string" || !TIPOS.includes(valor as TipoAvaliacao)) {
        throw new AvaliacaoValidationError("Finalidade de avaliação inválida.", "TIPO_INVALIDO", campo);
      }
      patch.tipo_avaliacao = valor as TipoAvaliacao;
    }
  }
  if (Object.keys(patch).length === 0) throw new AvaliacaoValidationError("Nenhum campo de avaliação enviado para atualização.");
  return patch;
}

async function professorDoContexto(contexto: ContextoAvaliacao, executor?: Executor): Promise<string | undefined> {
  if (contexto.tipoUsuario !== "professor") return undefined;
  const professor = await avaliacaoRepository.buscarProfessorPorUsuarioId(contexto.usuarioId, executor);
  if (!professor || professor.ativo !== true) throw new AvaliacaoForbiddenError();
  return String(professor.id);
}

function validarPermissao(professorId: string | undefined, atribuicao: { professor_id?: string | null }) {
  if (professorId && atribuicao.professor_id !== professorId) throw new AvaliacaoForbiddenError();
}

function validarOfertaAtiva(oferta: Oferta) {
  if (!oferta.periodo_ativo || ["fechado", "encerrado", "concluido", "inativo"].includes(oferta.periodo_status.toLowerCase())) {
    throw new AvaliacaoConflictError("PERIODO_FECHADO", "O período letivo está fechado.");
  }
  if (oferta.status.toLowerCase() !== "ativa" || oferta.turma_status.toLowerCase() !== "ativa") {
    throw new AvaliacaoConflictError("OFERTA_INATIVA", "A oferta ou sua turma está inativa.");
  }
  if (oferta.matriz_curso_id && oferta.matriz_curso_id !== oferta.curso_id) {
    throw new AvaliacaoConflictError("VINCULO_PRESERVADO", "A matriz da disciplina não corresponde ao curso da oferta.");
  }
}

async function autorizarOferta(id: string, professorId: string | undefined, executor?: Executor): Promise<Oferta> {
  const oferta = await avaliacaoRepository.buscarAtribuicaoPorId(id, executor);
  if (!oferta) {
    if (professorId) throw new AvaliacaoForbiddenError();
    throw new AvaliacaoNotFoundError("Oferta não encontrada.");
  }
  validarPermissao(professorId, oferta);
  return oferta;
}

function validarPlano(candidato: Pick<Avaliacao, "tipo_avaliacao" | "subgrupo_id" | "valor">,
  regra: RegraPontuacao | null, avaliacoes: Avaliacao[], idAtual?: string) {
  if (!regra) throw new AvaliacaoConflictError("REGRA_AUSENTE", "Configure a pontuação antes de criar avaliações.", "turma_disciplina_id");
  if (candidato.tipo_avaliacao === "RECUPERACAO") {
    if (candidato.subgrupo_id !== null || parsePontos(candidato.valor) !== parsePontos(regra.totalPontos)) {
      throw new AvaliacaoValidationError("A recuperação deve conservar o máximo da regra e não possui subgrupo.");
    }
    return;
  }
  const grupo = regra.subgrupos.find((g) => g.id === candidato.subgrupo_id);
  if (!grupo) throw new AvaliacaoValidationError("O subgrupo não pertence à regra da oferta.", "UUID_INVALIDO", "subgrupo_id");
  const outras = avaliacoes.filter((a) => a.id !== idAtual && a.tipo_avaliacao !== "RECUPERACAO" && a.subgrupo_id === grupo.id);
  if (grupo.modoQuantidade === "FIXA" && outras.length >= grupo.quantidadeFixa!) {
    throw new AvaliacaoConflictError("QUANTIDADE_EXCEDIDA", "Não há vagas disponíveis neste subgrupo.", "subgrupo_id");
  }
  const total = somarPontos(outras.map((a) => parsePontos(a.valor))) + parsePontos(candidato.valor, { positivo: true, campo: "valor" });
  if (total > parsePontos(grupo.orcamentoPontos)) {
    throw new AvaliacaoConflictError("ORCAMENTO_EXCEDIDO", "Os pontos excedem o saldo do subgrupo.", "valor");
  }
}

async function listar(contexto: ContextoAvaliacao, turmaDisciplinaId?: string) {
  exigirPerfil(contexto);
  const ofertaId = turmaDisciplinaId === undefined ? undefined : uuid(turmaDisciplinaId, "turma_disciplina_id");
  const professorId = await professorDoContexto(contexto);
  if (ofertaId) await autorizarOferta(ofertaId, professorId);
  return avaliacaoRepository.buscarTodas(professorId, ofertaId);
}

async function listarAtribuicoes(contexto: ContextoAvaliacao) {
  exigirPerfil(contexto);
  return avaliacaoRepository.listarAtribuicoes(await professorDoContexto(contexto));
}

async function buscarPorId(id: string, contexto: ContextoAvaliacao) {
  exigirPerfil(contexto);
  id = uuid(id, "id");
  const professorId = await professorDoContexto(contexto);
  const avaliacao = await avaliacaoRepository.buscarPorId(id);
  if (!avaliacao) {
    if (professorId) throw new AvaliacaoForbiddenError();
    throw new AvaliacaoNotFoundError();
  }
  validarPermissao(professorId, avaliacao);
  await autorizarOferta(avaliacao.turma_disciplina_id, professorId);
  return avaliacao;
}

async function criar(dados: unknown, contexto: ContextoAvaliacao) {
  exigirPerfil(contexto);
  const payload = normalizarCadastro(objeto(dados));
  return avaliacaoRepository.transacaoAcademica({ ofertaIds: [payload.turma_disciplina_id], estrutural: true }, async (trx) => {
    const professorId = await professorDoContexto(contexto, trx);
    const oferta = await autorizarOferta(payload.turma_disciplina_id, professorId, trx);
    validarOfertaAtiva(oferta);
    const regra = await avaliacaoRepository.buscarRegraDaOferta(oferta.id, trx);
    validarPlano(payload, regra,
      await avaliacaoRepository.buscarPorTurmaDisciplina(oferta.id, trx));
    // A auditoria recebe o perfil autenticado e o vínculo existe antes do INSERT,
    // para que o guard SQL não fixe o uso sem registrar o responsável.
    await avaliacaoRepository.vincularPrimeiroUso(oferta.id, contexto, trx);
    return avaliacaoRepository.criar(payload, trx);
  });
}

async function atualizar(id: string, dados: unknown, contexto: ContextoAvaliacao) {
  exigirPerfil(contexto);
  id = uuid(id, "id");
  const patch = normalizarPatch(objeto(dados));
  const estrutural = ESTRUTURAIS.some((campo) => Object.hasOwn(patch, campo));
  return avaliacaoRepository.transacaoAcademica({ avaliacaoId: id,
    ofertaIds: patch.turma_disciplina_id ? [patch.turma_disciplina_id] : [], estrutural }, async (trx) => {
    const professorId = await professorDoContexto(contexto, trx);
    const atual = await avaliacaoRepository.buscarPorId(id, trx);
    if (!atual) throw new AvaliacaoNotFoundError();
    // Reatribuição docente da origem é decisiva, ainda que o DTO antigo conserve
    // outro professor. Origem e destino são autorizados antes de compor o plano.
    const origem = await autorizarOferta(atual.turma_disciplina_id, professorId, trx);
    const destinoId = patch.turma_disciplina_id ?? atual.turma_disciplina_id;
    const destino = destinoId === origem.id ? origem : await autorizarOferta(destinoId, professorId, trx);
    validarOfertaAtiva(origem);
    validarOfertaAtiva(destino);
    const candidato = { ...atual, ...patch };
    const mudouEstrutura = ESTRUTURAIS.some((campo) => candidato[campo] !== atual[campo]);
    if (atual.primeiraNotaEm && mudouEstrutura) {
      throw new AvaliacaoConflictError("AVALIACAO_COM_NOTA", "Avaliação preservada após a primeira nota.");
    }
    if (candidato.tipo_avaliacao !== atual.tipo_avaliacao && candidato.tipo_avaliacao !== "REGULAR") {
      throw new AvaliacaoValidationError("A recuperação não é criada pelo fluxo de avaliações regulares.", "TIPO_INVALIDO", "tipo_avaliacao");
    }
    validarDatas(dataArmazenada(candidato.data_lancamento), candidato.data_devolucao ? dataArmazenada(candidato.data_devolucao) : null);
    if (mudouEstrutura) {
      const regra = await avaliacaoRepository.buscarRegraDaOferta(destino.id, trx);
      validarPlano(candidato, regra, await avaliacaoRepository.buscarPorTurmaDisciplina(destino.id, trx), id);
      await avaliacaoRepository.vincularPrimeiroUso(destino.id, contexto, trx);
    }
    const resultado = await avaliacaoRepository.atualizar(id, patch, trx);
    if (!resultado) throw new AvaliacaoNotFoundError();
    return resultado;
  });
}

async function deletar(id: string, contexto: ContextoAvaliacao) {
  exigirPerfil(contexto);
  id = uuid(id, "id");
  await avaliacaoRepository.transacaoAcademica({ avaliacaoId: id, estrutural: false }, async (trx) => {
    const professorId = await professorDoContexto(contexto, trx);
    const atual = await avaliacaoRepository.buscarPorId(id, trx);
    if (!atual) throw new AvaliacaoNotFoundError();
    const oferta = await autorizarOferta(atual.turma_disciplina_id, professorId, trx);
    validarOfertaAtiva(oferta);
    if (atual.primeiraNotaEm) throw new AvaliacaoConflictError("AVALIACAO_COM_NOTA", "Avaliação preservada após a primeira nota.");
    await avaliacaoRepository.deletar(id, trx);
  });
}

export const avaliacaoService = { listar, listarAtribuicoes, buscarPorId, criar, atualizar, deletar };

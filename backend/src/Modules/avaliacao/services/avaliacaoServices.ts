import { avaliacaoRepository } from "../repository/avaliacaoRepository.js";
import type { AtualizarAvaliacaoDTO, Avaliacao, AvaliacaoCompetencia, ContextoAvaliacao, CriarAvaliacaoDTO, TipoAvaliacao } from "../models/avaliacaoModels.js";
import { AvaliacaoConflictError, AvaliacaoForbiddenError, AvaliacaoNotFoundError, AvaliacaoValidationError } from "../errors/avaliacaoErrors.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PROVAS = 3;
const VALOR_PROVA = 20;
const VALOR_TPI = 5;
const LIMITE_TRABALHOS = 35;
const LIMITE_AVALIACOES_REGULARES = 100;
const TIPOS_REGULARES: TipoAvaliacao[] = ["PROVA", "TPI", "TRABALHO"];

const ehGestor = (tipo: string) => ["secretaria", "administrador"].includes(tipo.toLowerCase());

function validarUuid(valor: string, campo: string) {
  if (!UUID.test(valor)) throw new AvaliacaoValidationError(`${campo} invalido.`);
}

function normalizarPayload(dados: CriarAvaliacaoDTO): CriarAvaliacaoDTO {
  const payload = { ...dados, descricao_avaliacao: dados.descricao_avaliacao?.trim() || "", data_devolucao: dados.data_devolucao || null };
  if (payload.tipo_avaliacao === "PROVA") payload.valor = VALOR_PROVA;
  if (payload.tipo_avaliacao === "TPI") payload.valor = VALOR_TPI;
  return payload;
}

function validarDados(dados: CriarAvaliacaoDTO) {
  if (!TIPOS_REGULARES.includes(dados.tipo_avaliacao)) throw new AvaliacaoValidationError("Tipo de avaliacao invalido. Use PROVA, TPI ou TRABALHO.");
  validarUuid(dados.turma_disciplina_id, "turma_disciplina_id");
  if (typeof dados.valor !== "number" || !Number.isFinite(dados.valor) || dados.valor <= 0) throw new AvaliacaoValidationError("Valor da avaliacao invalido.");
  if (!dados.data_lancamento || Number.isNaN(Date.parse(String(dados.data_lancamento)))) throw new AvaliacaoValidationError("Data de lancamento invalida.");
  if (dados.data_devolucao && Number.isNaN(Date.parse(String(dados.data_devolucao)))) throw new AvaliacaoValidationError("Data de devolucao invalida.");
  if (dados.data_devolucao && new Date(dados.data_devolucao) < new Date(dados.data_lancamento)) throw new AvaliacaoValidationError("A data de devolucao nao pode ser anterior ao lancamento.");
}

function normalizarCompetencias(valor: unknown): AvaliacaoCompetencia[] | undefined {
  if (valor === undefined) return undefined;
  if (!Array.isArray(valor)) throw new AvaliacaoValidationError("Competencias da avaliacao invalidas.");
  const ids = new Set<string>();
  const competencias = valor.map((item: any) => {
    const competenciaId = String(item?.competencia_id ?? item?.competenciaId ?? "").trim();
    validarUuid(competenciaId, "competencia_id");
    if (ids.has(competenciaId)) throw new AvaliacaoValidationError("Competencia repetida na avaliacao.");
    ids.add(competenciaId);
    const peso = Number(item?.peso_percentual ?? item?.pesoPercentual);
    if (!Number.isFinite(peso) || peso <= 0 || peso > 100) {
      throw new AvaliacaoValidationError("O peso de cada competencia deve ser maior que zero e menor ou igual a 100.");
    }
    return { competencia_id: competenciaId, peso_percentual: Number(peso.toFixed(2)) };
  });
  if (competencias.length) {
    const soma = competencias.reduce((total, item) => total + item.peso_percentual, 0);
    if (Math.abs(soma - 100) > 0.005) {
      throw new AvaliacaoValidationError("Os pesos das competencias devem totalizar 100%.");
    }
  }
  return competencias;
}

function mesmoMapeamento(atual: AvaliacaoCompetencia[], proposto: AvaliacaoCompetencia[]) {
  const ordenar = (itens: AvaliacaoCompetencia[]) => itens
    .map((item) => ({ competencia_id: String(item.competencia_id), peso_percentual: Number(Number(item.peso_percentual).toFixed(2)) }))
    .sort((a, b) => a.competencia_id.localeCompare(b.competencia_id));
  return JSON.stringify(ordenar(atual)) === JSON.stringify(ordenar(proposto));
}

async function validarCompetenciasDaAtribuicao(
  turmaDisciplinaId: string,
  competencias: AvaliacaoCompetencia[],
  executor: any,
) {
  if (!competencias.length) return;
  const disponiveis = await avaliacaoRepository.buscarCompetenciasDisponiveis(turmaDisciplinaId, executor);
  const idsDisponiveis = new Set(disponiveis.map((item) => String(item.competencia_id)));
  if (competencias.some((item) => !idsDisponiveis.has(item.competencia_id))) {
    throw new AvaliacaoValidationError("A avaliacao so pode usar competencias vinculadas a sua disciplina.");
  }
}

function validarRegras(candidato: CriarAvaliacaoDTO, avaliacoes: Avaliacao[], idAtual?: string) {
  const outras = avaliacoes.filter((item) => item.id !== idAtual);
  if (candidato.tipo_avaliacao === "PROVA" && outras.filter((item) => item.tipo_avaliacao === "PROVA").length >= MAX_PROVAS) {
    throw new AvaliacaoValidationError("Ja existem 3 provas cadastradas de 20 pontos.");
  }
  if (candidato.tipo_avaliacao === "TPI" && outras.some((item) => item.tipo_avaliacao === "TPI")) {
    throw new AvaliacaoValidationError("Ja existe um TPI cadastrado de 5 pontos.");
  }
  const totalTrabalhos = outras
    .filter((item) => item.tipo_avaliacao === "TRABALHO")
    .reduce((soma, item) => soma + Number(item.valor), 0);
  if (candidato.tipo_avaliacao === "TRABALHO" && totalTrabalhos + candidato.valor > LIMITE_TRABALHOS) {
    throw new AvaliacaoValidationError("Os trabalhos podem somar no maximo 35 pontos.");
  }
  // Recuperacao e substitutiva: nao entra no somatorio das avaliacoes regulares (limite de 100).
  const totalRegular = outras.filter((item) => TIPOS_REGULARES.includes(item.tipo_avaliacao)).reduce((soma, item) => soma + Number(item.valor), 0);
  if (totalRegular + candidato.valor > LIMITE_AVALIACOES_REGULARES) {
    throw new AvaliacaoValidationError("As avaliacoes regulares podem somar no maximo 100 pontos.");
  }
}

async function professorDoContexto(contexto: ContextoAvaliacao) {
  if (ehGestor(contexto.tipoUsuario)) return undefined;
  const professor = await avaliacaoRepository.buscarProfessorPorUsuarioId(contexto.usuarioId);
  if (!professor) throw new AvaliacaoForbiddenError("Usuario professor sem vinculo ativo.");
  return String(professor.id);
}

function validarPermissao(professorId: string | undefined, atribuicao: any) {
  if (professorId && String(atribuicao.professor_id) !== professorId) throw new AvaliacaoForbiddenError();
}

function validarAtribuicaoAtiva(atribuicao: any) {
  if (String(atribuicao.status).toLowerCase() !== "ativa") throw new AvaliacaoValidationError("Turma/disciplina inativa.");
}

async function listar(contexto: ContextoAvaliacao, turmaDisciplinaId?: string) {
  if (turmaDisciplinaId) validarUuid(turmaDisciplinaId, "turma_disciplina_id");
  return avaliacaoRepository.buscarTodas(await professorDoContexto(contexto), turmaDisciplinaId);
}

async function listarAtribuicoes(contexto: ContextoAvaliacao) {
  return avaliacaoRepository.listarAtribuicoes(await professorDoContexto(contexto));
}

async function listarCompetenciasDaAtribuicao(turmaDisciplinaId: string, contexto: ContextoAvaliacao) {
  validarUuid(turmaDisciplinaId, "turma_disciplina_id");
  const professorId = await professorDoContexto(contexto);
  const atribuicao = await avaliacaoRepository.buscarAtribuicaoPorId(turmaDisciplinaId);
  if (!atribuicao) throw new AvaliacaoValidationError("Turma/disciplina inexistente.");
  validarAtribuicaoAtiva(atribuicao);
  validarPermissao(professorId, atribuicao);
  return avaliacaoRepository.buscarCompetenciasDisponiveis(turmaDisciplinaId);
}

async function buscarPorId(id: string, contexto: ContextoAvaliacao) {
  validarUuid(id, "ID");
  const [avaliacao, professorId] = await Promise.all([avaliacaoRepository.buscarPorId(id), professorDoContexto(contexto)]);
  if (!avaliacao) throw new AvaliacaoNotFoundError();
  validarPermissao(professorId, avaliacao);
  return avaliacao;
}

async function criar(dados: CriarAvaliacaoDTO, contexto: ContextoAvaliacao) {
  const competencias = normalizarCompetencias(dados.competencias) ?? [];
  const payload = { ...normalizarPayload(dados), competencias };
  validarDados(payload);
  const professorId = await professorDoContexto(contexto);
  try {
    return await avaliacaoRepository.transacao(async (trx) => {
      await avaliacaoRepository.bloquearAtribuicoes([payload.turma_disciplina_id], trx);
      const atribuicao = await avaliacaoRepository.buscarAtribuicaoPorId(payload.turma_disciplina_id, trx);
      if (!atribuicao) throw new AvaliacaoValidationError("Turma/disciplina inexistente.");
      validarAtribuicaoAtiva(atribuicao);
      validarPermissao(professorId, atribuicao);
      validarRegras(payload, await avaliacaoRepository.buscarPorTurmaDisciplina(payload.turma_disciplina_id, trx));
      await validarCompetenciasDaAtribuicao(payload.turma_disciplina_id, competencias, trx);
      const criada = await avaliacaoRepository.criar(payload, trx);
      await avaliacaoRepository.substituirCompetencias(criada.id, competencias, trx);
      if (!competencias.length) return { ...criada, competencias: [] };
      return (await avaliacaoRepository.buscarPorId(criada.id, trx)) ?? { ...criada, competencias };
    });
  } catch (erro: any) {
    if (erro?.code === "23503") throw new AvaliacaoValidationError("Relacionamento academico invalido.");
    throw erro;
  }
}

async function atualizar(id: string, dados: AtualizarAvaliacaoDTO, contexto: ContextoAvaliacao) {
  validarUuid(id, "ID");
  if (!dados || Object.keys(dados).length === 0) throw new AvaliacaoValidationError("Nenhum campo enviado para atualizacao.");
  const competenciasEnviadas = Object.prototype.hasOwnProperty.call(dados, "competencias");
  const competenciasNormalizadas = normalizarCompetencias(dados.competencias);
  const professorId = await professorDoContexto(contexto);
  return avaliacaoRepository.transacao(async (trx) => {
    await avaliacaoRepository.bloquearAvaliacao(id, trx);
    const atual = await avaliacaoRepository.buscarPorId(id, trx);
    if (!atual) throw new AvaliacaoNotFoundError();
    validarPermissao(professorId, atual);
    const destino = dados.turma_disciplina_id ?? atual.turma_disciplina_id;
    await avaliacaoRepository.bloquearAtribuicoes([atual.turma_disciplina_id, destino], trx);
    const atribuicao = await avaliacaoRepository.buscarAtribuicaoPorId(destino, trx);
    if (!atribuicao) throw new AvaliacaoValidationError("Turma/disciplina inexistente.");
    validarAtribuicaoAtiva(atribuicao);
    validarPermissao(professorId, atribuicao);
    const competenciasAtuais = await avaliacaoRepository.listarCompetenciasDaAvaliacao(id, trx);
    const competenciasFinais = competenciasEnviadas ? competenciasNormalizadas ?? [] : competenciasAtuais;
    if (competenciasEnviadas && !mesmoMapeamento(competenciasAtuais, competenciasFinais) && await avaliacaoRepository.possuiNotas(id, trx)) {
      throw new AvaliacaoConflictError("As competencias e os pesos nao podem ser alterados porque esta avaliacao ja possui notas.");
    }
    await validarCompetenciasDaAtribuicao(destino, competenciasFinais, trx);
    const payload = normalizarPayload({
      tipo_avaliacao: dados.tipo_avaliacao ?? atual.tipo_avaliacao,
      descricao_avaliacao: dados.descricao_avaliacao ?? atual.descricao_avaliacao ?? "",
      data_lancamento: dados.data_lancamento ?? atual.data_lancamento,
      valor: dados.valor ?? Number(atual.valor), data_devolucao: dados.data_devolucao !== undefined ? dados.data_devolucao : atual.data_devolucao,
      turma_disciplina_id: destino,
      competencias: competenciasEnviadas ? competenciasFinais : undefined,
    });
    validarDados(payload);
    validarRegras(payload, await avaliacaoRepository.buscarPorTurmaDisciplina(destino, trx), id);
    const resultado = await avaliacaoRepository.atualizar(id, payload, trx);
    if (!resultado) throw new AvaliacaoNotFoundError();
    const mapeamentoAlterado = competenciasEnviadas && !mesmoMapeamento(competenciasAtuais, competenciasFinais);
    if (mapeamentoAlterado) {
      await avaliacaoRepository.substituirCompetencias(id, competenciasFinais, trx);
    }
    if (!mapeamentoAlterado) return resultado;
    return (await avaliacaoRepository.buscarPorId(id, trx)) ?? { ...resultado, competencias: competenciasFinais };
  });
}

async function deletar(id: string, contexto: ContextoAvaliacao) {
  validarUuid(id, "ID");
  const professorId = await professorDoContexto(contexto);
  await avaliacaoRepository.transacao(async (trx) => {
    await avaliacaoRepository.bloquearAvaliacao(id, trx);
    const avaliacao = await avaliacaoRepository.buscarPorId(id, trx);
    if (!avaliacao) throw new AvaliacaoNotFoundError();
    validarPermissao(professorId, avaliacao);
    await avaliacaoRepository.bloquearAtribuicoes([avaliacao.turma_disciplina_id], trx);
    await avaliacaoRepository.deletar(id, trx);
  });
}

export const avaliacaoService = { listar, listarAtribuicoes, listarCompetenciasDaAtribuicao, buscarPorId, criar, atualizar, deletar };

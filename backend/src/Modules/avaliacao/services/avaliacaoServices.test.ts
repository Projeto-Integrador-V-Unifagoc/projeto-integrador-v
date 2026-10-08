import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegraPontuacao } from "../models/RegraPontuacao";
import { avaliacaoService } from "./avaliacaoServices.js";
import { calcularPlanoAvaliacao } from "./PlanoAvaliacaoService";

// Boundary acordado: somente o repository é simulado. Este executor sentinela
// verifica encaminhamento; não demonstra locks, isolamento ou rollback SQL.
const repo = vi.hoisted(() => ({
  transacaoAcademica: vi.fn(), buscarRegraDaOferta: vi.fn(), vincularPrimeiroUso: vi.fn(),
  buscarProfessorPorUsuarioId: vi.fn(), buscarAtribuicaoPorId: vi.fn(),
  buscarTodas: vi.fn(), listarAtribuicoes: vi.fn(), buscarPorId: vi.fn(),
  buscarPorTurmaDisciplina: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), deletar: vi.fn(),
}));
vi.mock("../repository/avaliacaoRepository.js", () => ({ avaliacaoRepository: repo }));

const TD1 = "11111111-1111-4111-8111-111111111111";
const TD2 = "22222222-2222-4222-8222-222222222222";
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REGRA_ID = "33333333-3333-4333-8333-333333333333";
const CURSO_ID = "44444444-4444-4444-8444-444444444444";
const PERIODO_ID = "55555555-5555-4555-8555-555555555555";
const GRUPO_A = "77777777-7777-4777-8777-777777777777";
const GRUPO_B = "88888888-8888-4888-8888-888888888888";
const GRUPO_C = "99999999-9999-4999-8999-999999999999";
const GRUPO_ALHEIO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PROF_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ADMIN = { usuarioId: "66666666-6666-4666-8666-666666666666", tipoUsuario: "administrador" };
const PROFESSOR = { usuarioId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", tipoUsuario: "professor" };
const TRX = Object.freeze({ executorSentinela: "unidade-sem-banco" });

const service = avaliacaoService;

function regra(): RegraPontuacao {
  return {
    id: REGRA_ID, cursoId: CURSO_ID, periodoLetivoId: PERIODO_ID, totalPontos: "120.00",
    origem: "CONFIGURADA", versao: 1, estado: "DISPONIVEL", usadaEm: null,
    criadaEm: "2026-09-28T12:00:00.000Z", atualizadaEm: "2026-09-28T12:00:00.000Z",
    criadaPorUsuarioId: ADMIN.usuarioId, atualizadaPorUsuarioId: ADMIN.usuarioId,
    subgrupos: [
      { id: GRUPO_A, nome: "Provas", orcamentoPontos: "72.00", modoQuantidade: "FIXA", quantidadeFixa: 4, ordem: 0 },
      { id: GRUPO_B, nome: "Avaliações institucionais", orcamentoPontos: "6.00", modoQuantidade: "FIXA", quantidadeFixa: 1, ordem: 1 },
      { id: GRUPO_C, nome: "Trabalhos e projetos", orcamentoPontos: "42.00", modoQuantidade: "SEM_LIMITE", quantidadeFixa: null, ordem: 2 },
    ],
  };
}

function oferta(id = TD1) {
  return {
    id, curso_id: CURSO_ID, periodo_letivo_id: PERIODO_ID, turma_id: randomUUID(),
    professor_id: PROF_ID, status: "ativa", turma_status: "ativa", periodo_status: "aberto", periodo_ativo: true,
    regra_pontuacao_id: REGRA_ID, pontuacao_vinculada_em: "2026-09-28T12:00:00.000Z",
  };
}

function entrada(alteracoes: Record<string, unknown> = {}) {
  return {
    tipo_avaliacao: "REGULAR", subgrupo_id: GRUPO_A, turma_disciplina_id: TD1,
    descricao_avaliacao: "Prova do primeiro módulo", data_lancamento: "2026-10-01",
    data_devolucao: "2026-10-08", valor: "18.00", ...alteracoes,
  };
}

function avaliacao(alteracoes: Record<string, unknown> = {}): any {
  return { id: ID, ...entrada(), professor_id: PROF_ID, regraPontuacaoId: REGRA_ID, primeiraNotaEm: null, ...alteracoes };
}

let ofertas: Map<string, ReturnType<typeof oferta>>;
let regras: Map<string, RegraPontuacao | null>;
let registros: Map<string, any>;

function adicionar(valores: string[], grupo: string | null = GRUPO_A, ofertaId = TD1, tipo = "REGULAR") {
  for (const valor of valores) {
    const item = avaliacao({ id: randomUUID(), valor, subgrupo_id: grupo, turma_disciplina_id: ofertaId, tipo_avaliacao: tipo });
    registros.set(item.id, item);
  }
}

function itensDaOferta(ofertaId = TD1): any[] {
  return [...registros.values()].filter((a) => a.turma_disciplina_id === ofertaId);
}

function semGravacao() {
  expect(repo.criar).not.toHaveBeenCalled();
  expect(repo.atualizar).not.toHaveBeenCalled();
  expect(repo.deletar).not.toHaveBeenCalled();
  expect(repo.vincularPrimeiroUso).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  ofertas = new Map([[TD1, oferta()], [TD2, oferta(TD2)]]);
  const configurada = regra();
  regras = new Map([[TD1, configurada], [TD2, configurada]]);
  registros = new Map();
  repo.transacaoAcademica.mockImplementation(async (_alvos, callback) => callback(TRX));
  repo.buscarProfessorPorUsuarioId.mockResolvedValue({ id: PROF_ID, ativo: true });
  repo.buscarAtribuicaoPorId.mockImplementation(async (id) => ofertas.get(id));
  repo.buscarRegraDaOferta.mockImplementation(async (id) => regras.get(id) ?? null);
  repo.buscarPorId.mockImplementation(async (id) => registros.get(id));
  repo.buscarPorTurmaDisciplina.mockImplementation(async (id) => itensDaOferta(id));
  repo.buscarTodas.mockImplementation(async (professorId, ofertaId) => [...registros.values()]
    .filter((a) => (!professorId || a.professor_id === professorId) && (!ofertaId || a.turma_disciplina_id === ofertaId)));
  repo.listarAtribuicoes.mockImplementation(async (professorId) => [...ofertas.values()]
    .filter((a) => !professorId || a.professor_id === professorId));
  repo.criar.mockImplementation(async (dados) => {
    const item = avaliacao({ ...dados, id: randomUUID(), regraPontuacaoId: regras.get(dados.turma_disciplina_id)?.id });
    registros.set(item.id, item);
    return { ...item };
  });
  repo.atualizar.mockImplementation(async (id, dados) => {
    const atual = registros.get(id);
    if (!atual) return undefined;
    const item = { ...atual, ...dados, regraPontuacaoId: regras.get(dados.turma_disciplina_id ?? atual.turma_disciplina_id)?.id };
    registros.set(id, item);
    return { ...item };
  });
  repo.deletar.mockImplementation(async (id) => { registros.delete(id); });
});

describe("cadastro regular pelo contrato textual", () => {
  it("define REGULAR quando omitido e conserva o máximo individual escolhido", async () => {
    const dados: Record<string, unknown> = entrada({ valor: "12" });
    delete dados.tipo_avaliacao;
    const criada = await service.criar(dados, ADMIN);
    expect(criada).toMatchObject({ tipo_avaliacao: "REGULAR", subgrupo_id: GRUPO_A, valor: "12.00", regraPontuacaoId: REGRA_ID, primeiraNotaEm: null });
    expect(repo.transacaoAcademica).toHaveBeenCalledWith(expect.objectContaining({ ofertaIds: [TD1] }), expect.any(Function));
    expect(repo.buscarRegraDaOferta).toHaveBeenCalledWith(TD1, TRX);
    expect(repo.buscarPorTurmaDisciplina).toHaveBeenCalledWith(TD1, TRX);
    expect(repo.criar).toHaveBeenCalledWith(expect.objectContaining({ valor: "12.00", subgrupo_id: GRUPO_A }), TRX);
    expect(repo.vincularPrimeiroUso).toHaveBeenCalledWith(TD1, ADMIN, TRX);
  });

  it.each(["18", "18.0", "18.00"])("normaliza %s para duas casas sem máximo fixo", async (valor) => {
    expect((await service.criar(entrada({ valor }), ADMIN)).valor).toBe("18.00");
  });

  it.each([
    [18, "VALOR_INVALIDO"], [0, "VALOR_INVALIDO"], [null, "VALOR_INVALIDO"], [undefined, "VALOR_INVALIDO"],
    ["0", "VALOR_INVALIDO"], ["0.00", "VALOR_INVALIDO"], ["-1", "VALOR_INVALIDO"], ["+1", "VALOR_INVALIDO"],
    ["1e1", "VALOR_INVALIDO"], ["18,00", "VALOR_INVALIDO"], [" 18", "VALOR_INVALIDO"], ["18\n", "VALOR_INVALIDO"],
    ["018", "VALOR_INVALIDO"], ["1.000,00", "VALOR_INVALIDO"], ["18.001", "PRECISAO_INVALIDA"],
  ])("rejeita máximo inválido %j", async (valor, codigo) => {
    await expect(service.criar(entrada({ valor }), ADMIN)).rejects.toMatchObject({ status: 400, codigo });
    semGravacao();
  });

  it.each(["RECUPERACAO", "PROVA", "TPI", "TRABALHO", "OUTRO"])("não cria finalidade %s pelo POST regular", async (tipo_avaliacao) => {
    await expect(service.criar(entrada({ tipo_avaliacao }), ADMIN)).rejects.toMatchObject({ status: 400 });
    semGravacao();
  });

  it.each([undefined, null, "", "subgrupo-invalido"])("exige UUID de subgrupo: %j", async (subgrupo_id) => {
    await expect(service.criar(entrada({ subgrupo_id }), ADMIN)).rejects.toMatchObject({ status: 400, codigo: "UUID_INVALIDO" });
    semGravacao();
  });

  it("não aceita UUID de subgrupo pertencente a outra regra", async () => {
    await expect(service.criar(entrada({ subgrupo_id: GRUPO_ALHEIO }), ADMIN)).rejects.toMatchObject({ status: 400 });
    semGravacao();
  });

  it("bloqueia cadastro sem regra, sem fallback para 100", async () => {
    regras.set(TD1, null);
    await expect(service.criar(entrada(), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "REGRA_AUSENTE" });
    semGravacao();
  });

  it("o nome livre do subgrupo não decide a finalidade da avaliação", async () => {
    regras.get(TD1)!.subgrupos[0].nome = "RECUPERACAO";
    expect((await service.criar(entrada(), ADMIN)).tipo_avaliacao).toBe("REGULAR");
  });
});

describe("orçamento e quantidade por oferta/subgrupo", () => {
  it("aceita 12, 18, 18 e 24 no grupo 72/FIXA4 e completa a regra 120", async () => {
    const criadas = [];
    for (const valor of ["12", "18", "18", "24"]) criadas.push(await service.criar(entrada({ valor }), PROFESSOR));
    await service.criar(entrada({ subgrupo_id: GRUPO_B, valor: "6" }), PROFESSOR);
    await service.criar(entrada({ subgrupo_id: GRUPO_C, valor: "42" }), PROFESSOR);
    expect(criadas.map((a) => a.valor)).toEqual(["12.00", "18.00", "18.00", "24.00"]);
    const plano = calcularPlanoAvaliacao(TD1, regra(), itensDaOferta());
    expect(plano).toMatchObject({ totalPontos: "120.00", planoCompleto: true, podeCriarRegular: false });
    expect(plano.subgrupos.map((g) => [g.pontosDistribuidos, g.saldoPontos, g.quantidadeAtual, g.completo]))
      .toEqual([["72.00", "0.00", 4, true], ["6.00", "0.00", 1, true], ["42.00", "0.00", 1, true]]);
  });

  it("rejeita a quinta avaliação mesmo quando resta orçamento", async () => {
    adicionar(["1.00", "1.00", "1.00", "1.00"]);
    await expect(service.criar(entrada({ valor: "1" }), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "QUANTIDADE_EXCEDIDA" });
    semGravacao();
  });

  it("três avaliações somando 72 continuam incompletas e não comportam outro máximo positivo", async () => {
    adicionar(["24.00", "24.00", "24.00"]);
    expect(calcularPlanoAvaliacao(TD1, regra(), itensDaOferta()).subgrupos[0])
      .toMatchObject({ pontosDistribuidos: "72.00", quantidadeAtual: 3, quantidadeDisponivel: 1, completo: false });
    await expect(service.criar(entrada({ valor: "0.01" }), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "ORCAMENTO_EXCEDIDO" });
    semGravacao();
  });

  it("rejeita excesso de um centésimo antes de preencher quatro vagas", async () => {
    adicionar(["12.00", "18.00", "18.00"]);
    await expect(service.criar(entrada({ valor: "24.01" }), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "ORCAMENTO_EXCEDIDO" });
    semGravacao();
  });

  it("grupo 6/FIXA1 aceita máximo variável e proíbe segunda vaga", async () => {
    expect((await service.criar(entrada({ subgrupo_id: GRUPO_B, valor: "3.50" }), ADMIN)).valor).toBe("3.50");
    expect(calcularPlanoAvaliacao(TD1, regra(), itensDaOferta()).subgrupos[1]).toMatchObject({ saldoPontos: "2.50", completo: false });
    await expect(service.criar(entrada({ subgrupo_id: GRUPO_B, valor: "2.50" }), ADMIN))
      .rejects.toMatchObject({ status: 409, codigo: "QUANTIDADE_EXCEDIDA" });
    expect(repo.criar).toHaveBeenCalledTimes(1);
  });

  it("SEM_LIMITE permite várias avaliações, mas respeita os 42 pontos", async () => {
    adicionar(Array(43).fill("0.10"), GRUPO_C);
    const criada = await service.criar(entrada({ subgrupo_id: GRUPO_C, valor: "37.70" }), ADMIN);
    expect(criada.valor).toBe("37.70");
    expect(calcularPlanoAvaliacao(TD1, regra(), itensDaOferta()).subgrupos[2])
      .toMatchObject({ quantidadeAtual: 44, quantidadeDisponivel: null, saldoPontos: "0.00", completo: true });
    await expect(service.criar(entrada({ subgrupo_id: GRUPO_C, valor: "0.01" }), ADMIN))
      .rejects.toMatchObject({ status: 409, codigo: "ORCAMENTO_EXCEDIDO" });
    expect(repo.criar).toHaveBeenCalledTimes(1);
  });

  it("soma 0,10 e 0,20 exatamente, sem arredondamento binário", async () => {
    const pequena = regra();
    pequena.totalPontos = "0.30";
    pequena.subgrupos = [{ ...pequena.subgrupos[2], orcamentoPontos: "0.30" }];
    regras.set(TD1, pequena);
    adicionar(["0.10"], GRUPO_C);
    expect((await service.criar(entrada({ subgrupo_id: GRUPO_C, valor: "0.20" }), ADMIN)).valor).toBe("0.20");
    await expect(service.criar(entrada({ subgrupo_id: GRUPO_C, valor: "0.01" }), ADMIN))
      .rejects.toMatchObject({ status: 409, codigo: "ORCAMENTO_EXCEDIDO" });
  });

  it("ignora recuperação no orçamento e nas vagas regulares", async () => {
    adicionar(["12.00", "18.00", "18.00"]);
    adicionar(["120.00"], null, TD1, "RECUPERACAO");
    expect((await service.criar(entrada({ valor: "24.00" }), ADMIN)).valor).toBe("24.00");
    expect(calcularPlanoAvaliacao(TD1, regra(), itensDaOferta()).subgrupos[0])
      .toMatchObject({ pontosDistribuidos: "72.00", quantidadeAtual: 4 });
  });

  it("inclui tipos históricos no orçamento sem normalizar seus máximos", async () => {
    adicionar(["70.00"], GRUPO_A, TD1, "PROVA");
    await expect(service.criar(entrada({ valor: "2.01" }), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "ORCAMENTO_EXCEDIDO" });
    semGravacao();
    expect(itensDaOferta()[0]).toMatchObject({ tipo_avaliacao: "PROVA", valor: "70.00" });
  });

  it("não compartilha vagas ou saldo com outra oferta da mesma regra", async () => {
    adicionar(["12.00", "18.00", "18.00", "24.00"]);
    expect((await service.criar(entrada({ turma_disciplina_id: TD2, valor: "72.00" }), ADMIN)).valor).toBe("72.00");
    expect(repo.buscarPorTurmaDisciplina).toHaveBeenCalledWith(TD2, TRX);
    expect(calcularPlanoAvaliacao(TD2, regra(), itensDaOferta(TD2)).subgrupos[0]).toMatchObject({ quantidadeAtual: 1, completo: false });
    expect(itensDaOferta(TD1).map((a) => a.valor)).toEqual(["12.00", "18.00", "18.00", "24.00"]);
  });
});

describe("edição e movimento antes da primeira nota", () => {
  beforeEach(() => { registros.set(ID, avaliacao()); });

  it("desconta o próprio registro ao editar o máximo e as vagas", async () => {
    adicionar(["12.00", "18.00", "24.00"]);
    expect((await service.atualizar(ID, { valor: "18" }, ADMIN)).valor).toBe("18.00");
    expect(repo.atualizar).toHaveBeenCalledWith(ID, expect.objectContaining({ valor: "18.00" }), TRX);
  });

  it("revalida orçamento e rejeita uma edição excedente sem alterar o registro", async () => {
    adicionar(["12.00", "18.00", "24.00"]);
    const anterior = structuredClone(registros.get(ID));
    await expect(service.atualizar(ID, { valor: "18.01" }, ADMIN)).rejects.toMatchObject({ status: 409, codigo: "ORCAMENTO_EXCEDIDO" });
    expect(registros.get(ID)).toEqual(anterior);
    semGravacao();
  });

  it("move entre subgrupos revalidando o destino e liberando o orçamento de origem", async () => {
    const movida = await service.atualizar(ID, { subgrupo_id: GRUPO_C }, ADMIN);
    expect(movida).toMatchObject({ id: ID, subgrupo_id: GRUPO_C, valor: "18.00" });
    const plano = calcularPlanoAvaliacao(TD1, regra(), itensDaOferta());
    expect(plano.subgrupos[0]).toMatchObject({ pontosDistribuidos: "0.00", quantidadeAtual: 0 });
    expect(plano.subgrupos[2]).toMatchObject({ pontosDistribuidos: "18.00", saldoPontos: "24.00" });
  });

  it("move entre ofertas autorizadas, vincula o destino e conserva a identidade", async () => {
    adicionar(["12.00"], GRUPO_A, TD1);
    adicionar(["18.00"], GRUPO_A, TD2);
    const movida = await service.atualizar(ID, { turma_disciplina_id: TD2 }, PROFESSOR);
    expect(movida).toMatchObject({ id: ID, turma_disciplina_id: TD2, subgrupo_id: GRUPO_A, valor: "18.00" });
    expect(repo.transacaoAcademica).toHaveBeenCalledWith(expect.objectContaining({ avaliacaoId: ID, estrutural: true }), expect.any(Function));
    expect(repo.buscarAtribuicaoPorId).toHaveBeenCalledWith(TD1, TRX);
    expect(repo.buscarAtribuicaoPorId).toHaveBeenCalledWith(TD2, TRX);
    expect(repo.vincularPrimeiroUso).toHaveBeenCalledWith(TD2, PROFESSOR, TRX);
    expect(ofertas.get(TD1)!.regra_pontuacao_id).toBe(REGRA_ID);
    expect(calcularPlanoAvaliacao(TD1, regra(), itensDaOferta(TD1)).subgrupos[0].pontosDistribuidos).toBe("12.00");
    expect(calcularPlanoAvaliacao(TD2, regra(), itensDaOferta(TD2)).subgrupos[0].pontosDistribuidos).toBe("36.00");
  });

  it.each(["origem", "destino"])("nega movimento sem autorização na %s antes de compor o plano", async (lado) => {
    ofertas.get(lado === "origem" ? TD1 : TD2)!.professor_id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const anterior = structuredClone(registros.get(ID));
    await expect(service.atualizar(ID, { turma_disciplina_id: TD2 }, PROFESSOR))
      .rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" });
    expect(repo.buscarRegraDaOferta).not.toHaveBeenCalled();
    expect(repo.buscarPorTurmaDisciplina).not.toHaveBeenCalled();
    expect(registros.get(ID)).toEqual(anterior);
    semGravacao();
  });

  it.each(["sem regra", "sem orçamento", "sem vagas", "subgrupo alheio"])("destino %s mantém origem intacta", async (condicao) => {
    let dados: Record<string, unknown> = { turma_disciplina_id: TD2 };
    if (condicao === "sem regra") regras.set(TD2, null);
    if (condicao === "sem orçamento") adicionar(["60.00"], GRUPO_A, TD2);
    if (condicao === "sem vagas") adicionar(["1.00", "1.00", "1.00", "1.00"], GRUPO_A, TD2);
    if (condicao === "subgrupo alheio") dados = { ...dados, subgrupo_id: GRUPO_ALHEIO };
    const anteriores = structuredClone([...registros]);
    await expect(service.atualizar(ID, dados, ADMIN)).rejects.toMatchObject({ status: condicao === "subgrupo alheio" ? 400 : 409 });
    expect([...registros]).toEqual(anteriores);
    semGravacao();
  });

  it("exclui avaliação sem nota, preservando a vinculação histórica da oferta", async () => {
    await service.deletar(ID, PROFESSOR);
    expect(repo.deletar).toHaveBeenCalledWith(ID, TRX);
    expect(registros.has(ID)).toBe(false);
    expect(ofertas.get(TD1)).toMatchObject({ regra_pontuacao_id: REGRA_ID, pontuacao_vinculada_em: "2026-09-28T12:00:00.000Z" });
  });
});

describe("preservação desde a primeira nota, inclusive zero", () => {
  beforeEach(() => {
    // A nota zero já fixou o marcador pelo escritor protegido. O valor da nota
    // não decide o bloqueio e apagá-la depois não limpa este marcador.
    registros.set(ID, avaliacao({ primeiraNotaEm: "2026-10-02T12:00:00.000Z" }));
  });

  it.each([
    { valor: "19.00" }, { subgrupo_id: GRUPO_C }, { turma_disciplina_id: TD2 }, { tipo_avaliacao: "RECUPERACAO" },
  ])("rejeita mudança estrutural %j após primeira nota zero", async (dados) => {
    const anterior = structuredClone(registros.get(ID));
    await expect(service.atualizar(ID, dados, ADMIN)).rejects.toMatchObject({ status: 409, codigo: "AVALIACAO_COM_NOTA" });
    expect(registros.get(ID)).toEqual(anterior);
    semGravacao();
  });

  it("rejeita exclusão pelo marcador mesmo sem notas restantes", async () => {
    await expect(service.deletar(ID, ADMIN)).rejects.toMatchObject({ status: 409, codigo: "AVALIACAO_COM_NOTA" });
    expect(registros.has(ID)).toBe(true);
    semGravacao();
  });

  it("permite descrição e datas pelo fluxo autorizado, conservando máximo e marcador", async () => {
    const editada = await service.atualizar(ID, { descricao_avaliacao: "Descrição revisada", data_lancamento: "2026-10-03", data_devolucao: "2026-10-10" }, PROFESSOR);
    expect(editada).toMatchObject({ descricao_avaliacao: "Descrição revisada", data_lancamento: "2026-10-03", data_devolucao: "2026-10-10", valor: "18.00", primeiraNotaEm: "2026-10-02T12:00:00.000Z" });
    expect(repo.transacaoAcademica).toHaveBeenCalledWith(expect.objectContaining({ avaliacaoId: ID, estrutural: false }), expect.any(Function));
  });

  it("reenviar máximo equivalente não muda a estrutura nem bloqueia os metadados", async () => {
    const editada = await service.atualizar(ID, { valor: "18", descricao_avaliacao: "Mesmo máximo" }, ADMIN);
    expect(editada).toMatchObject({ valor: "18.00", descricao_avaliacao: "Mesmo máximo", primeiraNotaEm: "2026-10-02T12:00:00.000Z" });
  });

  it.each([
    ["PROVA", "12.50", GRUPO_A], ["TPI", "3.10", GRUPO_B], ["TRABALHO", "17.75", GRUPO_C], ["RECUPERACAO", "120.00", null],
  ])("edição de metadados conserva tipo histórico %s e máximo %s", async (tipo_avaliacao, valor, subgrupo_id) => {
    registros.set(ID, avaliacao({ tipo_avaliacao, valor, subgrupo_id, primeiraNotaEm: "2026-10-02T12:00:00.000Z" }));
    const editada = await service.atualizar(ID, { descricao_avaliacao: "Documento corrigido", data_devolucao: null }, ADMIN);
    expect(editada).toMatchObject({ tipo_avaliacao, valor, subgrupo_id, data_devolucao: null, primeiraNotaEm: "2026-10-02T12:00:00.000Z" });
  });
});

describe("escopo, vínculos e leitura", () => {
  it.each(["secretaria", "administrador", "professor"])("permite cadastro ao perfil %s mantendo o ator original", async (tipoUsuario) => {
    const contexto = { usuarioId: PROFESSOR.usuarioId, tipoUsuario };
    expect((await service.criar(entrada(), contexto)).turma_disciplina_id).toBe(TD1);
    expect(repo.vincularPrimeiroUso).toHaveBeenCalledWith(TD1, contexto, TRX);
    if (tipoUsuario === "professor") expect(repo.buscarProfessorPorUsuarioId).toHaveBeenCalledWith(contexto.usuarioId, TRX);
  });

  it.each(["aluno", "desconhecido"])("nega perfil %s antes de consultar ou compor dados", async (tipoUsuario) => {
    await expect(service.criar(entrada(), { usuarioId: ADMIN.usuarioId, tipoUsuario }))
      .rejects.toMatchObject({ status: 403, codigo: "PERFIL_PROIBIDO" });
    expect(repo.transacaoAcademica).not.toHaveBeenCalled();
    expect(repo.buscarAtribuicaoPorId).not.toHaveBeenCalled();
    expect(repo.buscarRegraDaOferta).not.toHaveBeenCalled();
    semGravacao();
  });

  it.each(["listar", "listarAtribuicoes", "buscarPorId", "atualizar", "deletar"])("nega aluno também em %s", async (operacao) => {
    const aluno = { usuarioId: ADMIN.usuarioId, tipoUsuario: "aluno" };
    const promessa = operacao === "listar" ? service.listar(aluno) : operacao === "listarAtribuicoes" ? service.listarAtribuicoes(aluno)
      : operacao === "buscarPorId" ? service.buscarPorId(ID, aluno) : operacao === "atualizar" ? service.atualizar(ID, { descricao_avaliacao: "x" }, aluno) : service.deletar(ID, aluno);
    await expect(promessa).rejects.toMatchObject({ status: 403, codigo: "PERFIL_PROIBIDO" });
    expect(repo.buscarPorId).not.toHaveBeenCalled();
    expect(repo.buscarTodas).not.toHaveBeenCalled();
    semGravacao();
  });

  it("professor sem vínculo ativo é negado antes da leitura da regra", async () => {
    repo.buscarProfessorPorUsuarioId.mockResolvedValue(undefined);
    await expect(service.criar(entrada(), PROFESSOR)).rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" });
    expect(repo.buscarRegraDaOferta).not.toHaveBeenCalled();
    expect(repo.buscarPorTurmaDisciplina).not.toHaveBeenCalled();
    semGravacao();
  });

  it("professor fora da oferta é negado antes de compor orçamento", async () => {
    ofertas.get(TD1)!.professor_id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await expect(service.criar(entrada(), PROFESSOR)).rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" });
    expect(repo.buscarRegraDaOferta).not.toHaveBeenCalled();
    expect(repo.buscarPorTurmaDisciplina).not.toHaveBeenCalled();
    semGravacao();
  });

  it.each(["fechado", "encerrado", "concluido", "inativo"])("período %s bloqueia cadastro", async (status) => {
    ofertas.get(TD1)!.periodo_status = status;
    await expect(service.criar(entrada(), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "PERIODO_FECHADO" });
    semGravacao();
  });

  it("período com ativo=false bloqueia cadastro", async () => {
    ofertas.get(TD1)!.periodo_ativo = false;
    await expect(service.criar(entrada(), ADMIN)).rejects.toMatchObject({ status: 409, codigo: "PERIODO_FECHADO" });
    semGravacao();
  });

  it.each(["status", "turma_status"])("%s inativa não permite cadastro", async (campo) => {
    ofertas.get(TD1)![campo as "status" | "turma_status"] = "inativa";
    await expect(service.criar(entrada(), ADMIN)).rejects.toMatchObject({ status: 409 });
    semGravacao();
  });

  it("movimento não contorna fechamento do período da origem", async () => {
    registros.set(ID, avaliacao());
    ofertas.get(TD1)!.periodo_status = "fechado";
    await expect(service.atualizar(ID, { turma_disciplina_id: TD2 }, ADMIN)).rejects.toMatchObject({ status: 409, codigo: "PERIODO_FECHADO" });
    semGravacao();
  });

  it.each(["buscarPorId", "atualizar", "deletar"])("retorna 404 em %s de avaliação inexistente", async (operacao) => {
    const promessa = operacao === "buscarPorId" ? service.buscarPorId(ID, ADMIN)
      : operacao === "atualizar" ? service.atualizar(ID, { descricao_avaliacao: "x" }, ADMIN) : service.deletar(ID, ADMIN);
    await expect(promessa).rejects.toMatchObject({ status: 404, codigo: "REGISTRO_NAO_ENCONTRADO" });
    semGravacao();
  });

  it("lista apenas ofertas do professor e conserva tipo histórico e pontos textuais", async () => {
    registros.set(ID, avaliacao({ tipo_avaliacao: "PROVA", valor: "12.50" }));
    adicionar(["30.00"], GRUPO_C, TD2);
    const alheia = itensDaOferta(TD2)[0];
    alheia.professor_id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    ofertas.get(TD2)!.professor_id = alheia.professor_id;
    expect(await service.listar(PROFESSOR)).toEqual([registros.get(ID)]);
    expect((await service.listarAtribuicoes(PROFESSOR)).map((a) => a.id)).toEqual([TD1]);
    expect((await service.buscarPorId(ID, PROFESSOR)).valor).toBe("12.50");
  });

  it("busca e exclusão por professor alheio não expõem nem alteram avaliação", async () => {
    registros.set(ID, avaliacao({ professor_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }));
    ofertas.get(TD1)!.professor_id = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await expect(service.buscarPorId(ID, PROFESSOR)).rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" });
    await expect(service.deletar(ID, PROFESSOR)).rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" });
    expect(registros.has(ID)).toBe(true);
    semGravacao();
  });
});

describe("UUIDs e calendário", () => {
  it.each(["buscarPorId", "atualizar", "deletar", "listar"])("valida UUID na operação %s", async (operacao) => {
    const promessa = operacao === "buscarPorId" ? service.buscarPorId("invalido", ADMIN)
      : operacao === "atualizar" ? service.atualizar("invalido", { valor: "18.00" }, ADMIN)
        : operacao === "deletar" ? service.deletar("invalido", ADMIN) : service.listar(ADMIN, "invalido");
    await expect(promessa).rejects.toMatchObject({ status: 400, codigo: "UUID_INVALIDO" });
    semGravacao();
  });

  it("valida UUID da oferta de cadastro", async () => {
    await expect(service.criar(entrada({ turma_disciplina_id: "invalido" }), ADMIN)).rejects.toMatchObject({ status: 400, codigo: "UUID_INVALIDO" });
    semGravacao();
  });

  it("oferta inexistente não cria avaliação", async () => {
    ofertas.delete(TD1);
    await expect(service.criar(entrada(), ADMIN)).rejects.toMatchObject({ status: 404, codigo: "REGISTRO_NAO_ENCONTRADO" });
    semGravacao();
  });

  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "01/10/2026", "2026-10-01T12:00:00Z", "2026-1-1", "", null])
    ("rejeita lançamento fora do calendário AAAA-MM-DD: %j", async (data_lancamento) => {
      await expect(service.criar(entrada({ data_lancamento }), ADMIN)).rejects.toMatchObject({ status: 400, codigo: "DATA_INVALIDA" });
      semGravacao();
    });

  it("aceita dia bissexto válido e devolução no mesmo dia", async () => {
    const criada = await service.criar(entrada({ data_lancamento: "2028-02-29", data_devolucao: "2028-02-29" }), ADMIN);
    expect(criada).toMatchObject({ data_lancamento: "2028-02-29", data_devolucao: "2028-02-29" });
  });

  it.each(["2026-02-30", "2026-09-30", "2026-10-08T12:00:00Z"])("rejeita devolução inválida ou anterior: %s", async (data_devolucao) => {
    await expect(service.criar(entrada({ data_devolucao }), ADMIN)).rejects.toMatchObject({ status: 400, codigo: "DATA_INVALIDA" });
    semGravacao();
  });

  it("patch deve revalidar a ordem das duas datas", async () => {
    registros.set(ID, avaliacao());
    await expect(service.atualizar(ID, { data_lancamento: "2026-10-09" }, ADMIN)).rejects.toMatchObject({ status: 400, codigo: "DATA_INVALIDA" });
    semGravacao();
  });

  it("rejeita patch vazio sem gravação", async () => {
    registros.set(ID, avaliacao());
    await expect(service.atualizar(ID, {}, ADMIN)).rejects.toMatchObject({ status: 400 });
    semGravacao();
  });
});

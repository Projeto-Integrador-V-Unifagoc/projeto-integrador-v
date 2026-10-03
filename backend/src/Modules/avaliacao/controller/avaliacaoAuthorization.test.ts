import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { obterJwtSecret } from "../../../config/jwt";
import { ErroPontuacao } from "../models/RegraPontuacao";
import { ErroPontos } from "../models/Pontos";
import { avaliacaoRouter } from "../../routes/avaliacaoRoutes.js";

const servico = vi.hoisted(() => ({
  listar: vi.fn(), listarAtribuicoes: vi.fn(), buscarPorId: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), deletar: vi.fn(),
}));
const buscarPlano = vi.hoisted(() => vi.fn());
vi.mock("../services/avaliacaoServices.js", () => ({ avaliacaoService: servico }));
vi.mock("../services/PlanoAvaliacaoService", () => ({
  PlanoAvaliacaoService: class { buscar = buscarPlano; },
}));
vi.mock("../repository/avaliacaoRepository", () => ({ avaliacaoRepository: { listarParaPlano: vi.fn() } }));
// Nenhuma conexão, dotenv ou SQL participa desta unidade HTTP.
vi.mock("../../../database/index", () => ({ default: vi.fn(() => { throw new Error("Banco não permitido na unidade de transporte."); }) }));

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OFERTA = "11111111-1111-4111-8111-111111111111";
const DESTINO = "22222222-2222-4222-8222-222222222222";
const GRUPO = "77777777-7777-4777-8777-777777777777";
const REGRA = "33333333-3333-4333-8333-333333333333";
const USUARIO = "66666666-6666-4666-8666-666666666666";
const documento = {
  id: ID, tipo_avaliacao: "REGULAR", subgrupo_id: GRUPO, turma_disciplina_id: OFERTA,
  descricao_avaliacao: "Avaliação do módulo", data_lancamento: "2026-10-01", data_devolucao: "2026-10-08",
  valor: "18.00", regraPontuacaoId: REGRA, primeiraNotaEm: null,
};
const plano = { turmaDisciplinaId: OFERTA, regraPontuacaoId: REGRA, totalPontos: "120.00", planoCompleto: false, podeCriarRegular: true, motivosBloqueio: [], subgrupos: [] };
const app = express();
app.use(express.json());
app.use("/avaliacoes", avaliacaoRouter);

const operacoes = [
  { nome: "listar", metodo: "get", caminho: "/avaliacoes", status: 200 },
  { nome: "listarAtribuicoes", metodo: "get", caminho: "/avaliacoes/atribuicoes", status: 200 },
  { nome: "buscarPorId", metodo: "get", caminho: `/avaliacoes/${ID}`, status: 200 },
  { nome: "criar", metodo: "post", caminho: "/avaliacoes", status: 201 },
  { nome: "atualizar", metodo: "put", caminho: `/avaliacoes/${ID}`, status: 200 },
  { nome: "deletar", metodo: "delete", caminho: `/avaliacoes/${ID}`, status: 204 },
] as const;

type Operacao = typeof operacoes[number];
function chamada(operacao: Operacao, tipoUsuario?: string, corpo: Record<string, unknown> = documento) {
  const requisicao = request(app)[operacao.metodo](operacao.caminho);
  if (tipoUsuario) requisicao.set("Authorization", `Bearer ${jwt.sign({ id: USUARIO, tipo_usuario: tipoUsuario }, obterJwtSecret(), { expiresIn: "1h" })}`);
  return ["post", "put"].includes(operacao.metodo) ? requisicao.send(corpo) : requisicao;
}
function semConsulta() {
  for (const metodo of Object.values(servico)) expect(metodo).not.toHaveBeenCalled();
  expect(buscarPlano).not.toHaveBeenCalled();
}
function erroSeguro(corpo: unknown) {
  const json = JSON.stringify(corpo);
  expect(json).not.toMatch(/SELECT|piv\.|stack|sql|fixture_alheia|aluno-terceiro/i);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  servico.listar.mockResolvedValue([documento]);
  servico.listarAtribuicoes.mockResolvedValue([{ id: OFERTA }]);
  servico.buscarPorId.mockResolvedValue(documento);
  servico.criar.mockResolvedValue(documento);
  servico.atualizar.mockResolvedValue(documento);
  servico.deletar.mockResolvedValue(undefined);
  buscarPlano.mockResolvedValue(plano);
});
afterEach(() => vi.restoreAllMocks());

describe("autenticação e perfis nas rotas de avaliações", () => {
  it.each(operacoes)("sem token retorna 401 em $nome antes do serviço", async (operacao) => {
    const resposta = await chamada(operacao);
    expect(resposta.status).toBe(401);
    erroSeguro(resposta.body);
    semConsulta();
  });

  it.each(["token-solto", "Basic fixture", "Bearer token-invalido"])("retorna 401 para autorização inválida %s", async (authorization) => {
    const resposta = await request(app).post("/avaliacoes").set("Authorization", authorization).send(documento);
    expect(resposta.status).toBe(401);
    erroSeguro(resposta.body);
    semConsulta();
  });

  it.each(operacoes)("aluno recebe 403 em $nome antes de buscar dados", async (operacao) => {
    const resposta = await chamada(operacao, "aluno");
    expect(resposta.status).toBe(403);
    erroSeguro(resposta.body);
    semConsulta();
  });

  for (const perfil of ["secretaria", "administrador", "professor"]) {
    it.each(operacoes)(`${perfil} alcança $nome com contexto autenticado e perfil original`, async (operacao) => {
      const resposta = await chamada(operacao, perfil);
      expect(resposta.status).toBe(operacao.status);
      expect(servico[operacao.nome]).toHaveBeenCalled();
      const contexto = { usuarioId: USUARIO, tipoUsuario: perfil };
      const argumentos = servico[operacao.nome].mock.calls[0];
      expect(argumentos).toContainEqual(contexto);
      if (operacao.nome === "criar") expect(argumentos[0]).toMatchObject({ valor: "18.00", subgrupo_id: GRUPO });
    });
  }

  it("não concede autoridade enviada no corpo", async () => {
    await chamada(operacoes[3], "professor", { ...documento, usuarioId: "aluno-terceiro", tipoUsuario: "administrador" });
    expect(servico.criar).toHaveBeenCalledWith(expect.any(Object), { usuarioId: USUARIO, tipoUsuario: "professor" });
  });

  it("encaminha filtro de oferta autorizável ao listar", async () => {
    const token = jwt.sign({ id: USUARIO, tipo_usuario: "professor" }, obterJwtSecret(), { expiresIn: "1h" });
    const resposta = await request(app).get(`/avaliacoes?turma_disciplina_id=${OFERTA}`).set("Authorization", `Bearer ${token}`);
    expect(resposta.status).toBe(200);
    expect(servico.listar).toHaveBeenCalledWith({ usuarioId: USUARIO, tipoUsuario: "professor" }, OFERTA);
  });
});

describe("transporte do plano e dos pontos", () => {
  it("rota estática plano é resolvida antes da busca de avaliação por ID", async () => {
    const token = jwt.sign({ id: USUARIO, tipo_usuario: "professor" }, obterJwtSecret(), { expiresIn: "1h" });
    const resposta = await request(app).get(`/avaliacoes/plano/${OFERTA}`).set("Authorization", `Bearer ${token}`);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(plano);
    expect(buscarPlano).toHaveBeenCalledWith(OFERTA, { usuarioId: USUARIO, tipoUsuario: "professor" });
    expect(servico.buscarPorId).not.toHaveBeenCalled();
  });

  it("POST retorna UUIDs estáveis, valor textual e referências sem converter pontos", async () => {
    const resposta = await chamada(operacoes[3], "administrador");
    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual(documento);
    expect(typeof resposta.body.valor).toBe("string");
  });

  it("PUT conserva tipo e máximo históricos na resposta", async () => {
    servico.atualizar.mockResolvedValue({ ...documento, tipo_avaliacao: "PROVA", valor: "12.50", primeiraNotaEm: "2026-10-02T12:00:00.000Z" });
    const resposta = await chamada(operacoes[4], "secretaria", { descricao_avaliacao: "Revisada" });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ tipo_avaliacao: "PROVA", valor: "12.50", primeiraNotaEm: "2026-10-02T12:00:00.000Z" });
    expect(servico.atualizar).toHaveBeenCalledWith(ID, { descricao_avaliacao: "Revisada" }, { usuarioId: USUARIO, tipoUsuario: "secretaria" });
  });
});

describe("erros de domínio seguros e escopo no transporte", () => {
  it.each([
    [400, "UUID_INVALIDO", "subgrupo_id"], [409, "REGRA_AUSENTE", "turma_disciplina_id"],
    [409, "ORCAMENTO_EXCEDIDO", "valor"], [409, "QUANTIDADE_EXCEDIDA", "subgrupo_id"],
  ])("POST preserva status %i e código %s", async (status, codigo, campo) => {
    servico.criar.mockRejectedValue(new ErroPontuacao(status, codigo, "Operação rejeitada.", campo));
    const resposta = await chamada(operacoes[3], "professor");
    expect(resposta.status).toBe(status);
    expect(resposta.body).toEqual({ codigo, mensagem: "Operação rejeitada.", campos: [{ campo, codigo, mensagem: "Operação rejeitada." }] });
    erroSeguro(resposta.body);
  });

  it.each(["VALOR_INVALIDO", "PRECISAO_INVALIDA"] as const)("POST transporta %s do parser com o campo", async (codigo) => {
    servico.criar.mockRejectedValue(new ErroPontos(codigo, "Pontos inválidos.", "valor"));
    const resposta = await chamada(operacoes[3], "administrador");
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ codigo, mensagem: "Pontos inválidos.", campos: [{ campo: "valor", codigo, mensagem: "Pontos inválidos." }] });
    erroSeguro(resposta.body);
  });

  it.each(["sem vínculo ativo", "fora da oferta"])("professor %s recebe 403 sem dados alheios", async () => {
    servico.criar.mockRejectedValue(new ErroPontuacao(403, "ESCOPO_PROIBIDO", "Você não tem acesso a esta oferta."));
    const resposta = await chamada(operacoes[3], "professor");
    expect(resposta.status).toBe(403);
    expect(resposta.body).toMatchObject({ codigo: "ESCOPO_PROIBIDO", mensagem: "Você não tem acesso a esta oferta.", campos: [] });
    erroSeguro(resposta.body);
  });

  it.each(["origem", "destino"])("movimento negado na %s retorna erro opaco de escopo", async () => {
    servico.atualizar.mockRejectedValue(new ErroPontuacao(403, "ESCOPO_PROIBIDO", "Você não tem acesso a esta oferta."));
    const resposta = await chamada(operacoes[4], "professor", { turma_disciplina_id: DESTINO });
    expect(resposta.status).toBe(403);
    expect(resposta.body.codigo).toBe("ESCOPO_PROIBIDO");
    expect(servico.atualizar).toHaveBeenCalledWith(ID, { turma_disciplina_id: DESTINO }, { usuarioId: USUARIO, tipoUsuario: "professor" });
    erroSeguro(resposta.body);
  });

  it.each([operacoes[4], operacoes[5]])("$nome retorna 409 desde a primeira nota", async (operacao) => {
    servico[operacao.nome].mockRejectedValue(new ErroPontuacao(409, "AVALIACAO_COM_NOTA", "Avaliação preservada após a primeira nota."));
    const resposta = await chamada(operacao, "secretaria", { valor: "19.00" });
    expect(resposta.status).toBe(409);
    expect(resposta.body.codigo).toBe("AVALIACAO_COM_NOTA");
    erroSeguro(resposta.body);
  });

  it("busca inexistente retorna 404 com código observável", async () => {
    servico.buscarPorId.mockRejectedValue(new ErroPontuacao(404, "REGISTRO_NAO_ENCONTRADO", "Avaliação não encontrada."));
    const resposta = await chamada(operacoes[2], "administrador");
    expect(resposta.status).toBe(404);
    expect(resposta.body).toMatchObject({ codigo: "REGISTRO_NAO_ENCONTRADO", mensagem: "Avaliação não encontrada.", campos: [] });
  });

  it("erro inesperado do driver devolve 500 sem SQL, stack ou detalhes de terceiros", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const falha = Object.assign(new Error("SELECT fixture_alheia WHERE aluno='aluno-terceiro'"), { code: "XX000", sql: "SELECT piv.nota", detail: "aluno-terceiro" });
    servico.criar.mockRejectedValue(falha);
    const resposta = await chamada(operacoes[3], "administrador");
    expect(resposta.status).toBe(500);
    expect(resposta.body.codigo).toBe("FALHA_INTERNA");
    erroSeguro(resposta.body);
    expect(resposta.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(log).toHaveBeenCalledExactlyOnceWith("[academico] falha interna", {
      evento: "FALHA_ACADEMICA", operacao: "avaliacoes.operacao",
      correlacaoId: resposta.headers["x-request-id"], classificacao: "FALHA_INTERNA",
    });
  });
});

import express, { type RequestHandler } from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotaController } from "./NotaController";
import { NotaError } from "../errors/NotaError";
import { AuthContextGateway } from "../gateways/AuthContextGateway";

// O controlador recebe serviço simulado. Não importar app, repositório ou PostgreSQL.
vi.mock("../service/NotaService", () => ({ NotaService: class {} }));

const avaliacaoId = "55555555-5555-4555-8555-555555555555";
const usuarioId = "77777777-7777-4777-8777-777777777777";
const professorId = "33333333-3333-4333-8333-333333333333";
const alunoId = "22222222-2222-4222-8222-222222222222";
const executor = Object.freeze({ identificador: "executor-autorizacao-unitaria" });
const caminho = `/notas/avaliacoes/${avaliacaoId}/lote`;

afterEach(() => vi.restoreAllMocks());

function servidor(service: Record<string, any>) {
  const app = express();
  app.use(express.json());
  const autenticarSimulado: RequestHandler = (req, res, next) => {
    const perfil = req.header("x-perfil-sintetico");
    if (!perfil) { res.status(401).json({ codigo: "AUTENTICACAO_INVALIDA", mensagem: "Autenticação necessária." }); return; }
    (req as any).user = { id: usuarioId, tipo_usuario: perfil };
    next();
  };
  app.use(autenticarSimulado);
  const controller = new NotaController(service as any);
  app.put("/notas/avaliacoes/:avaliacaoId/lote", controller.salvarLote);
  app.get("/notas/avaliacoes/:avaliacaoId/lancamento", controller.obterLancamento);
  app.post("/notas/autorizacoes-excepcionais", controller.criarAutorizacao);
  return app;
}

function erro(status: number, codigo: string, mensagem: string, campos: any[] = []) {
  return Object.assign(new NotaError(mensagem, status, codigo), { campos });
}

describe("NotaController - contrato HTTP de notas sem banco", () => {
  it("não chama o serviço sem identidade autenticada", async () => {
    const salvarLote = vi.fn();
    const resposta = await request(servidor({ salvarLote })).put(caminho).send({ itens: [{ alunoId, valor: "0.00" }] });
    expect(resposta.status).toBe(401);
    expect(salvarLote).not.toHaveBeenCalled();
  });

  it.each(["professor", "secretaria", "administrador"])("encaminha ator %s e pontos textuais sem coerção", async (perfil) => {
    const payload = { itens: [{ alunoId, valor: "0.00" }], motivo: "Correção documentada", perfil: "aluno", usuarioId: alunoId };
    const salvarLote = vi.fn(async (_id, body, req) => {
      expect(body).toEqual(payload);
      expect(req.user).toMatchObject({ id: usuarioId, tipo_usuario: perfil });
      return { mensagem: "Notas salvas com sucesso.", avaliacao: { id: avaliacaoId, valorMaximo: "120.00" },
        alunos: [{ alunoId, valor: "0.00", lancada: true }, { alunoId: professorId, valor: null, lancada: false }] };
    });
    const resposta = await request(servidor({ salvarLote })).put(caminho).set("x-perfil-sintetico", perfil).send(payload);
    expect(resposta.status).toBe(200);
    expect(resposta.body.avaliacao.valorMaximo).toBe("120.00");
    expect(resposta.body.alunos).toEqual(expect.arrayContaining([
      expect.objectContaining({ valor: "0.00", lancada: true }), expect.objectContaining({ valor: null, lancada: false }),
    ]));
    expect(salvarLote).toHaveBeenCalledTimes(1);
  });

  it("preserva os campos de erro por item no lote sem transformar 400 em sucesso", async () => {
    const campos = [{ campo: "itens[1].valor", codigo: "PRECISAO_INVALIDA", mensagem: "Informe até duas casas decimais." }];
    const salvarLote = vi.fn(async () => { throw erro(400, "PRECISAO_INVALIDA", "Corrija o valor informado.", campos); });
    const resposta = await request(servidor({ salvarLote })).put(caminho).set("x-perfil-sintetico", "professor")
      .send({ itens: [{ alunoId, valor: "0.00" }, { alunoId: professorId, valor: "1.000" }] });
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ codigo: "PRECISAO_INVALIDA", mensagem: "Corrija o valor informado.", campos });
  });

  it.each([
    [403, "PERFIL_PROIBIDO", "aluno"],
    [403, "ESCOPO_PROIBIDO", "professor"],
    [404, "REGISTRO_NAO_ENCONTRADO", "secretaria"],
    [409, "PERIODO_FECHADO", "administrador"],
    [409, "PRAZO_EXPIRADO", "professor"],
    [409, "CONFLITO_CONCORRENCIA", "secretaria"],
  ])("preserva status %i e código %s seguros", async (status, codigo, perfil) => {
    const salvarLote = vi.fn(async () => { throw erro(Number(status), String(codigo), "Não foi possível concluir esta operação."); });
    const resposta = await request(servidor({ salvarLote })).put(caminho).set("x-perfil-sintetico", String(perfil))
      .send({ itens: [{ alunoId, valor: "10.00" }] });
    expect(resposta.status).toBe(status);
    expect(resposta.body).toMatchObject({ codigo, mensagem: "Não foi possível concluir esta operação." });
    expect(JSON.stringify(resposta.body)).not.toContain(alunoId);
    expect(resposta.body).not.toHaveProperty("stack");
  });

  it("mantém 201 para autorização e o perfil original do administrador autenticado", async () => {
    const criarAutorizacaoExcepcional = vi.fn(async (body, req) => {
      expect(req.user).toMatchObject({ id: usuarioId, tipo_usuario: "administrador" });
      return { mensagem: "Autorização registrada.", autorizacao: { id: avaliacaoId, motivo: body.motivo } };
    });
    const resposta = await request(servidor({ criarAutorizacaoExcepcional })).post("/notas/autorizacoes-excepcionais")
      .set("x-perfil-sintetico", "administrador").send({ avaliacaoId, motivo: "Correção documentada" });
    expect(resposta.status).toBe(201);
    expect(criarAutorizacaoExcepcional).toHaveBeenCalledTimes(1);
  });

  it("retorna 500 opaco e não registra o objeto do driver com SQL/payload", async () => {
    const privado = Object.assign(new Error("SQL SELECT aluno_privado FROM piv.nota"), {
      sql: "SELECT aluno_privado FROM piv.nota", detail: "UUID de terceiro", bindings: [alunoId],
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const salvarLote = vi.fn(async () => { throw privado; });
    const resposta = await request(servidor({ salvarLote })).put(caminho).set("x-perfil-sintetico", "professor")
      .send({ itens: [{ alunoId, valor: "10.00" }] });
    expect(resposta.status).toBe(500);
    expect(resposta.body).toMatchObject({ codigo: expect.any(String), mensagem: expect.any(String) });
    expect(JSON.stringify(resposta.body)).not.toMatch(/SQL|SELECT|piv\.|aluno_privado|UUID|bindings|stack/);
    expect(log.mock.calls.flat()).not.toContain(privado);
    expect(resposta.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(log).toHaveBeenCalledExactlyOnceWith("[academico] falha interna", {
      evento: "FALHA_ACADEMICA", operacao: "notas.salvarLote",
      correlacaoId: resposta.headers["x-request-id"], classificacao: "FALHA_INTERNA",
    });
  });
});

describe("AuthContextGateway - identidade original e executor explícito", () => {
  function gateway() {
    const repository = {
      buscarProfessorPorUsuarioId: vi.fn(async () => ({ id: professorId, ativo: true })),
      buscarAlunoPorUsuarioId: vi.fn(async () => ({ id: alunoId })),
    };
    return { repository, auth: new AuthContextGateway(repository) };
  }

  it.each(["administrador", "secretaria", "professor", "aluno"])("conserva perfil %s sem alias para auditoria", async (perfil) => {
    const { auth } = gateway();
    const contexto = await (auth.obterContexto as any)({ user: { id: usuarioId, tipo_usuario: perfil } }, executor);
    expect(contexto).toMatchObject({ usuarioId, perfil });
    if (perfil === "professor") expect(contexto.professorId).toBe(professorId);
    if (perfil === "aluno") expect(contexto.alunoId).toBe(alunoId);
  });

  it.each(["professor", "aluno"])("consulta vínculo %s com o executor recebido", async (perfil) => {
    const { auth, repository } = gateway();
    await (auth.obterContexto as any)({ user: { id: usuarioId, tipo_usuario: perfil } }, executor);
    const buscar = perfil === "professor" ? repository.buscarProfessorPorUsuarioId : repository.buscarAlunoPorUsuarioId;
    expect(buscar).toHaveBeenCalledExactlyOnceWith(usuarioId, executor);
  });

  it("nega docente inativo antes de compor dados acadêmicos", async () => {
    const repository = { buscarProfessorPorUsuarioId: vi.fn(async () => ({ id: professorId, ativo: false })),
      buscarAlunoPorUsuarioId: vi.fn() };
    await expect((new AuthContextGateway(repository).obterContexto as any)({ user: { id: usuarioId, tipo_usuario: "professor" } }, executor))
      .rejects.toMatchObject({ status: 403 });
    expect(repository.buscarAlunoPorUsuarioId).not.toHaveBeenCalled();
  });

  it.each([undefined, { id: usuarioId }, { id: usuarioId, tipo_usuario: "visitante" }])("nega identidade não autorizada sem buscar vínculos: %j", async (user) => {
    const { auth, repository } = gateway();
    await expect((auth.obterContexto as any)({ user }, executor)).rejects.toMatchObject({ status: 403 });
    expect(repository.buscarProfessorPorUsuarioId).not.toHaveBeenCalled();
    expect(repository.buscarAlunoPorUsuarioId).not.toHaveBeenCalled();
  });
});

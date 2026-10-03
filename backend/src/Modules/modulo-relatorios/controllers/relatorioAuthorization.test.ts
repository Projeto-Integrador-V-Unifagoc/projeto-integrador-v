import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotaError } from "../../notas/errors/NotaError";
import { RelatorioController } from "./RelatorioController";
const mocks = vi.hoisted(() => ({ listar: vi.fn(), status: vi.fn() }));
vi.mock("../services/RelatorioService", () => ({ RelatorioService: class {
  listarRelatorios = mocks.listar; obterStatusFonteDados = mocks.status;
} }));
function app(perfil?: string) {
  const a = express(), controller = new RelatorioController();
  a.use((req, _res, next) => { if (perfil) (req as any).user = { id: "usuario-sintetico", tipo_usuario: perfil }; next(); });
  a.get("/relatorios/academicos", controller.listarRelatoriosAcademicos.bind(controller));
  a.get("/relatorio-alunos", controller.listarRelatoriosAcademicos.bind(controller));
  a.get("/relatorios/academicos/status", controller.statusFonteDados.bind(controller));
  return a;
}
beforeEach(() => { vi.clearAllMocks(); mocks.listar.mockResolvedValue([]); mocks.status.mockResolvedValue({ source: "database" }); });
describe("Relatório e alias preservam autenticação e erros opacos", () => {
  it.each(["/relatorios/academicos", "/relatorio-alunos", "/relatorios/academicos/status"])("nega anônimo em %s antes do serviço", async rota => {
    expect((await request(app()).get(rota)).status).toBe(401);
    expect(mocks.listar).not.toHaveBeenCalled(); expect(mocks.status).not.toHaveBeenCalled();
  });
  it.each(["secretaria", "administrador", "professor", "aluno"])("passa req original de %s pelo alias", async perfil => {
    expect((await request(app(perfil)).get("/relatorio-alunos?perfil=Secretaria")).status).toBe(200);
    expect(mocks.listar.mock.calls[0][1]).toMatchObject({ user: { tipo_usuario: perfil } });
  });
  it("perfil desconhecido não chega ao serviço", async () => {
    expect((await request(app("visitante")).get("/relatorios/academicos")).status).toBe(403);
    expect(mocks.listar).not.toHaveBeenCalled();
  });
  it("preserva erro de domínio seguro e status 403", async () => {
    mocks.listar.mockRejectedValueOnce(new NotaError("Escopo negado.", 403, "ESCOPO_PROIBIDO"));
    const res = await request(app("professor")).get("/relatorios/academicos");
    expect(res.status).toBe(403); expect(res.body).toMatchObject({ codigo: "ESCOPO_PROIBIDO" });
  });
  it.each(["/relatorios/academicos", "/relatorios/academicos/status"])("oculta detalhe SQL inesperado em %s", async rota => {
    const erro = new Error("select cpf from pessoa; senha=sintética");
    mocks.listar.mockRejectedValueOnce(erro); mocks.status.mockRejectedValueOnce(erro);
    const res = await request(app("secretaria")).get(rota);
    expect(res.status).toBe(500); expect(res.body).toMatchObject({ codigo: "ERRO_INTERNO" });
    expect(JSON.stringify(res.body)).not.toMatch(/cpf|senha|select|details/);
  });
});

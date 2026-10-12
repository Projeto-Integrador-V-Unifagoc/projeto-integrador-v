import express, { type RequestHandler } from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FichaController } from "./FichaController";
import { NotaError } from "../../notas/errors/NotaError";

const mocks = vi.hoisted(() => ({ montarFicha: vi.fn() }));
vi.mock("../service/FichaService", () => ({ FichaService: class { montarFicha = mocks.montarFicha; } }));
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });
const alunoId = "11111111-1111-1111-1111-111111111111";

function servidor() {
  const app = express();
  const identidade: RequestHandler = (req, _res, next) => {
    const perfil = req.header("x-perfil-sintetico");
    if (perfil) (req as any).user = { id: "usuario-sintético", tipo_usuario: perfil };
    next();
  };
  app.use(identidade);
  const controller = new FichaController();
  app.get("/alunos/:id/ficha", (req, res) => controller.buscarFicha(req, res));
  return app;
}

describe("ficha protege informações pessoais/documentais antes de compor resultado", () => {
  it("nega ausência de autenticação sem chamar serviço", async () => {
    mocks.montarFicha.mockResolvedValue({ aluno: { cpf: "pessoal-sintético" }, documentos: [{ id: "documento" }] });
    const r = await request(servidor()).get(`/alunos/${alunoId}/ficha`);
    expect(r.status).toBe(401); expect(mocks.montarFicha).not.toHaveBeenCalled();
    expect(JSON.stringify(r.body)).not.toContain("pessoal-sintético");
  });

  it.each(["professor", "aluno", "visitante"])("nega %s inclusive para aluno com vínculo em uma oferta", async (perfil) => {
    mocks.montarFicha.mockResolvedValue({ aluno: { cpf: "pessoal-sintético" }, documentos: [{ id: "documento" }] });
    const r = await request(servidor()).get(`/alunos/${alunoId}/ficha`).set("x-perfil-sintetico", perfil);
    expect(r.status).toBe(403); expect(mocks.montarFicha).not.toHaveBeenCalled();
    expect(r.body).not.toHaveProperty("documentos"); expect(r.body).not.toHaveProperty("aluno");
  });

  it.each(["secretaria", "administrador"])("passa requisição autenticada de %s ao serviço", async (perfil) => {
    mocks.montarFicha.mockResolvedValue({ aluno: { id: alunoId }, notas: [] });
    const r = await request(servidor()).get(`/alunos/${alunoId}/ficha`).set("x-perfil-sintetico", perfil);
    expect(r.status).toBe(200);
    expect(mocks.montarFicha).toHaveBeenCalledWith(alunoId, expect.objectContaining({ user: { id: "usuario-sintético", tipo_usuario: perfil } }));
  });

  it("retorna erro de domínio seguro com status/código originais", async () => {
    mocks.montarFicha.mockRejectedValue(new NotaError("Escopo não permitido.", 403, "ESCOPO_PROIBIDO"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await request(servidor()).get(`/alunos/${alunoId}/ficha`).set("x-perfil-sintetico", "secretaria");
    expect(r.status).toBe(403); expect(r.body).toMatchObject({ codigo: "ESCOPO_PROIBIDO", mensagem: "Escopo não permitido." });
  });

  it("erro inesperado fica opaco sem SQL, CPF, documento ou stack", async () => {
    mocks.montarFicha.mockRejectedValue(new Error("SELECT senha FROM piv.usuario; cpf-sintético; documento-sintético; stack"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await request(servidor()).get(`/alunos/${alunoId}/ficha`).set("x-perfil-sintetico", "administrador");
    expect(r.status).toBe(500); expect(r.body).toMatchObject({ codigo: "ERRO_INTERNO" });
    expect(JSON.stringify(r.body)).not.toMatch(/SELECT|senha|cpf-sintético|documento-sintético|stack/);
    expect(r.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(log).toHaveBeenCalledExactlyOnceWith("[academico] falha interna", {
      evento: "FALHA_ACADEMICA", operacao: "ficha.buscar",
      correlacaoId: r.headers["x-request-id"], classificacao: "FALHA_INTERNA",
    });
  });
});

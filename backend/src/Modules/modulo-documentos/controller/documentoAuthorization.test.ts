import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { autenticar } from "../../../middlewares/autenticacao.js";
import { soSecretaria } from "../../../middlewares/autorizacao.js";
import { DocumentoAuthContext, ErroAutorizacaoDocumento } from "../service/DocumentoAuthContext.js";

function resposta() {
  const estado: any = { statusCode: 200, body: undefined };
  estado.status = (code: number) => ((estado.statusCode = code), estado);
  estado.json = (body: unknown) => ((estado.body = body), estado);
  return estado;
}

describe("autorização do módulo de documentos", () => {
  it("retorna 401 quando o token não é enviado (rotas exigem autenticação)", () => {
    const res = resposta();
    let proximo = false;
    autenticar({ headers: {} } as any, res as any, () => {
      proximo = true;
    });
    assert.equal(res.statusCode, 401);
    assert.equal(proximo, false);
  });

  it("bloqueia aluno e professor nas ações administrativas (listar todos, validar, deletar)", () => {
    for (const tipo_usuario of ["aluno", "professor"]) {
      const res = resposta();
      let proximo = false;
      soSecretaria({ user: { tipo_usuario } } as any, res as any, () => {
        proximo = true;
      });
      assert.equal(res.statusCode, 403);
      assert.equal(proximo, false);
    }
  });

  it("permite secretaria e administrador nas ações administrativas", () => {
    for (const tipo_usuario of ["secretaria", "administrador"]) {
      const res = resposta();
      let proximo = false;
      soSecretaria({ user: { tipo_usuario } } as any, res as any, () => {
        proximo = true;
      });
      assert.equal(proximo, true);
    }
  });

  it("rejeita perfis desconhecidos ou requisições sem usuário autenticado", async () => {
    const ctx = new DocumentoAuthContext({} as any);
    await assert.rejects(
      () => ctx.obterContexto({ user: undefined } as any),
      ErroAutorizacaoDocumento,
    );
    await assert.rejects(
      () => ctx.obterContexto({ user: { id: "1", tipo_usuario: "convidado" } } as any),
      ErroAutorizacaoDocumento,
    );
  });

  it("resolve o aluno_id vinculado ao usuário aluno autenticado", async () => {
    const repoFalso = {
      buscarAlunoPorUsuarioId: async (usuarioId: string) =>
        usuarioId === "usuario-1" ? { id: "aluno-1" } : null,
    };
    const ctx = new DocumentoAuthContext(repoFalso as any);

    const contexto = await ctx.obterContexto({
      user: { id: "usuario-1", tipo_usuario: "aluno" },
    } as any);
    assert.equal(contexto.perfil, "aluno");
    assert.equal(contexto.alunoId, "aluno-1");
  });

  it("rejeita usuário do tipo aluno sem vínculo de aluno cadastrado", async () => {
    const repoFalso = { buscarAlunoPorUsuarioId: async () => null };
    const ctx = new DocumentoAuthContext(repoFalso as any);

    await assert.rejects(
      () =>
        ctx.obterContexto({
          user: { id: "usuario-sem-vinculo", tipo_usuario: "aluno" },
        } as any),
      ErroAutorizacaoDocumento,
    );
  });

  it("trata administrador como secretaria (acesso irrestrito, sem exigir vínculo de aluno)", async () => {
    const ctx = new DocumentoAuthContext({} as any);
    const contexto = await ctx.obterContexto({
      user: { id: "usuario-admin", tipo_usuario: "administrador" },
    } as any);
    assert.equal(contexto.perfil, "secretaria");
    assert.equal(contexto.alunoId, undefined);
  });
});
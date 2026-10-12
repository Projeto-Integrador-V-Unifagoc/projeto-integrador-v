import type { Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarFalhaAcademica } from "./falhaAcademica";

afterEach(() => vi.restoreAllMocks());

function capturar(erro: unknown) {
  const res = { setHeader: vi.fn() };
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  registrarFalhaAcademica(res as unknown as Response, "estrutura.operacao", erro);
  return { res, log, evento: log.mock.calls[0]?.[1] as Record<string, unknown> };
}

describe("Diagnóstico técnico seguro de falhas acadêmicas", () => {
  it.each(["08006", "53300", "23514"])("classifica código de banco %s sem conteúdo do driver", (code) => {
    const privado = Object.assign(new Error("postgresql://credencial@alvo/SELECT pessoa"), {
      code, detail: "documento privado", query: "SELECT pessoa", bindings: ["cpf-privado"],
    });
    const { res, log, evento } = capturar(privado);
    expect(evento).toEqual({ evento: "FALHA_ACADEMICA", operacao: "estrutura.operacao",
      correlacaoId: expect.any(String), classificacao: "FALHA_BANCO", codigo: code });
    expect(res.setHeader).toHaveBeenCalledExactlyOnceWith("X-Request-ID", evento.correlacaoId);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/postgresql|credencial|SELECT|pessoa|documento|cpf|bindings|stack/);
  });

  it("classifica indisponibilidade de conexão e gera correlação independente por falha", () => {
    const { res, evento } = capturar(Object.assign(new Error("URL privada"), { code: "ECONNREFUSED" }));
    expect(evento).toMatchObject({ classificacao: "FALHA_INFRAESTRUTURA", codigo: "ECONNREFUSED" });
    registrarFalhaAcademica(res as unknown as Response, "ficha.buscar", null);
    expect(res.setHeader.mock.calls[1]?.[1]).not.toBe(evento.correlacaoId);
  });

  it("código livre não vira dado do log e mensagem permanece privada", () => {
    const { evento } = capturar({ code: "senha=conteudo-privado", message: "SELECT dados" });
    expect(evento.classificacao).toBe("FALHA_INTERNA");
    expect(evento).not.toHaveProperty("codigo");
    expect(JSON.stringify(evento)).not.toMatch(/senha|conteudo|SELECT/);
  });

  it("não invoca getter de code nem serialização do erro", () => {
    const getter = vi.fn(() => { throw new Error("Getter não permitido"); });
    const toJSON = vi.fn(() => { throw new Error("Serialização não permitida"); });
    const erro = Object.defineProperty({ toJSON }, "code", { get: getter });
    const { evento } = capturar(erro);
    expect(evento.classificacao).toBe("FALHA_INTERNA");
    expect(getter).not.toHaveBeenCalled(); expect(toJSON).not.toHaveBeenCalled();
  });
});

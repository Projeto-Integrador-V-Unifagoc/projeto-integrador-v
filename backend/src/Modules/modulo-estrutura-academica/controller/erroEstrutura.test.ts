import knex from "knex";
import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { responderErroEstrutura } from "./erroEstrutura";

const resposta = () => {
  const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res);
  return res;
};
describe("Transporte de erros da estrutura acadêmica", () => {
  it("erro de compilação do Knex sem code não expõe query, tabela ou bindings", async () => {
    const banco = knex({ client: "pg" });
    let erro: unknown;
    try { banco("piv.turma").where({ id: undefined }).toSQL(); } catch (e) { erro = e; }
    await banco.destroy();
    expect(erro).toBeInstanceOf(Error);
    const res = resposta(); responderErroEstrutura(res as unknown as Response, erro);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ codigo: "ERRO_INTERNO", mensagem: "Erro interno do servidor.", error: "Erro interno do servidor." });
  });
  it("erro inesperado sem código tem resposta opaca", () => {
    const res = resposta(); responderErroEstrutura(res as unknown as Response, new Error("Falha interna com dados sintéticos do servidor"));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("dados sintéticos");
  });
});

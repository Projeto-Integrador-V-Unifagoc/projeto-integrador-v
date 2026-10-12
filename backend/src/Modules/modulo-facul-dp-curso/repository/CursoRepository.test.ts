import { beforeEach, describe, expect, it, vi } from "vitest";
import CursoController from "../controller/CursoController";

const f = vi.hoisted(() => ({
  excluir: vi.fn(),
  regra: undefined as object | undefined,
  ofertas: [] as Array<{ regra_pontuacao_id: string | null; pontuacao_vinculada_em: string | null }>,
}));

vi.mock("../../../database/connection", () => ({ db: vi.fn() }));
vi.mock("../../modulo-estrutura-academica/gateways/TransacaoAcademica", () => ({
  ConflitoAcademico: class extends Error {},
  transacaoAcademica: async (_banco: unknown, _opcoes: unknown, operacao: Function) => {
    const trx = (tabela: string) => {
      const consulta = {
        where: () => consulta,
        whereIn: () => consulta,
        first: async () => tabela === "piv.regra_pontuacao" ? f.regra : { id: "curso-sintetico" },
        del: () => f.excluir(),
        then: (resolve: Function, reject: Function) => Promise.resolve(f.ofertas).then(resolve as any, reject as any),
      };
      return consulta;
    };
    return operacao(trx, { ofertas: [] });
  },
}));

async function remover() {
  const resposta = { status: vi.fn(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() };
  resposta.status.mockReturnValue(resposta);
  await new CursoController().removerCurso({ params: { id: "curso-sintetico" } }, resposta);
  return { status: resposta.status.mock.calls[0][0], body: resposta.json.mock.calls[0]?.[0] };
}

beforeEach(() => {
  f.excluir.mockReset().mockResolvedValue(1);
  f.regra = undefined;
  f.ofertas = [];
});

describe("Remoção do curso pela escrita acadêmica", () => {
  it("conserva 400 seguro para o FK comum de turma sem regra ou histórico", async () => {
    f.excluir.mockRejectedValue({ code: "23503", constraint: "turma_curso_id_foreign",
      message: "DELETE FROM piv.curso violates foreign key constraint turma_curso_id_foreign" });
    const resposta = await remover();
    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ codigo: "DADOS_ACADEMICOS_INVALIDOS",
      mensagem: "Nao e possivel remover o curso porque ele possui turmas cadastradas.",
      error: "Nao e possivel remover o curso porque ele possui turmas cadastradas." });
    expect(f.excluir).toHaveBeenCalledOnce();
  });

  it("conserva 409 para outro FK protegido", async () => {
    f.excluir.mockRejectedValue({ code: "23503", constraint: "regra_pontuacao_curso_id_foreign" });
    expect(await remover()).toMatchObject({ status: 409, body: { codigo: "ESTRUTURA_PRESERVADA" } });
  });

  it("não traduz outro SQLSTATE pela mera coincidência do nome da constraint", async () => {
    f.excluir.mockRejectedValue({ code: "23514", constraint: "turma_curso_id_foreign" });
    expect(await remover()).toMatchObject({ status: 409, body: { codigo: "ESTRUTURA_PRESERVADA" } });
  });

  it("preserva 409 antes de excluir um curso com regra institucional", async () => {
    f.regra = { id: "regra-sintetica" };
    expect(await remover()).toMatchObject({ status: 409, body: { codigo: "ESTRUTURA_PRESERVADA" } });
    expect(f.excluir).not.toHaveBeenCalled();
  });

  it("preserva 409 antes de excluir um curso com oferta já vinculada", async () => {
    f.ofertas = [{ regra_pontuacao_id: "regra-historica", pontuacao_vinculada_em: "2026-01-01" }];
    expect(await remover()).toMatchObject({ status: 409, body: { codigo: "ESTRUTURA_PRESERVADA" } });
    expect(f.excluir).not.toHaveBeenCalled();
  });

  it("mantém inesperados opacos, inclusive os dados do SQL", async () => {
    f.excluir.mockRejectedValue({ code: "XX000", message: "DELETE FROM piv.curso", detail: "dado interno", stack: "stack interna" });
    expect(await remover()).toEqual({ status: 500, body: { codigo: "ERRO_INTERNO",
      mensagem: "Erro interno do servidor.", error: "Erro interno do servidor." } });
  });
});

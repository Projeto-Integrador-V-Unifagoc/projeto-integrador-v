import { describe, expect, it, vi } from "vitest";
import { EstruturaAcademicaGateway } from "./EstruturaAcademicaGateway";

describe("estrutura acadêmica - consulta histórica administrativa", () => {
  it.each(["professor", "aluno"])("recusa opção histórica para %s antes de consultar estrutura ou pessoas", async (perfil) => {
    const executor = vi.fn() as any;
    const contexto = {
      usuarioId: "11111111-1111-4111-8111-111111111111",
      perfil,
      professorId: "22222222-2222-4222-8222-222222222222",
      alunoId: "33333333-3333-4333-8333-333333333333",
    } as any;
    await expect(new EstruturaAcademicaGateway().carregar({ incluirMatriculasHistoricas: true }, contexto, executor))
      .rejects.toMatchObject({ status: 403, codigo: "ESCOPO_PROIBIDO" });
    expect(executor).not.toHaveBeenCalled();
  });
});
